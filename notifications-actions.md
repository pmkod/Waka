# Actions qui créent ou suppriment des notifications

## Vue d’ensemble

Les notifications sont persistées par le service `backend/services/notification` dans le modèle `Notification`.

Types d’événements actuellement supportés :

- `FOLLOW`
- `POST_LIKE`
- `COMMENT_LIKE`
- `POST_COMMENT`
- `COMMENT_REPLY`

Le service évite les doublons avec les identifiants métier de la notification (`recipientId`, `initiatorId`, `eventType`, `targetId` et `groupKey`). `targetId` est polymorphique et nullable : il peut désigner un post, un commentaire ou rester nul pour un `FOLLOW`. Le client utilise `groupKey` pour regrouper les notifications et récupérer l’identifiant du post concerné pour les liens, puis `eventType` et `targetId` pour récupérer les autres données nécessaires. La construction des clés est centralisée dans `backend/shared/notification-group-key.builder.ts`. Le service ignore également les notifications dont le destinataire est le même que l’initiateur (`recipientId === initiatorId`).

## Actions qui créent des notifications

| Action | Route | Condition | Événement et destinataire | Identifiants utilisés |
| --- | --- | --- | --- | --- |
| Suivre un utilisateur | `POST /user/follow-user/{id}` | Une nouvelle relation de suivi est créée. Aucune notification n’est recréée si le suivi existe déjà. | `FOLLOW`, envoyé à l’utilisateur suivi. L’initiateur est l’utilisateur authentifié. | `recipientId + initiatorId + groupKey` (`targetId` nul) |
| Aimer un post | `POST /content/like-post/{postId}` | Un nouveau like est effectivement créé. | `POST_LIKE`, envoyé à l’auteur du post. L’initiateur est l’utilisateur qui aime le post. | `targetId` du post + `initiatorId` + `groupKey` |
| Aimer un commentaire | `POST /content/like-comment/{commentId}` | Un nouveau like de commentaire est effectivement créé. | `COMMENT_LIKE`, envoyé à l’auteur du commentaire. L’initiateur est l’utilisateur qui aime le commentaire. | `targetId` du commentaire + `initiatorId` + `groupKey` (`COMMENT_LIKE:{commentId}:{postId}`) |
| Ajouter un commentaire | `POST /content/create-comment` | Le commentaire est créé avec succès. | `POST_COMMENT` si le commentaire est directement rattaché au post, envoyé à l’auteur du post. | `targetId` du commentaire + `groupKey` du post |
| Répondre à un commentaire | `POST /content/create-comment` | Le commentaire est créé avec un `parentCommentId`. | `COMMENT_REPLY`, envoyé à l’auteur du commentaire parent. | `targetId` de la réponse + `groupKey` du commentaire parent et du post |

### Point d’entrée interne de création

Le service de notification crée réellement l’enregistrement avec :

- `POST /internal/notification/create-notification`
- Fichier : `backend/services/notification/src/features/notifications/routes/create-notification.route.ts`

Ce point d’entrée :

- refuse les notifications vers soi-même ;
- ignore les doublons détectés à partir des identifiants métier ;
- incrémente le compteur de notifications non vues du destinataire après création.

Les services `user` et `content` appellent ce point d’entrée via leur `notificationServiceClient`.

## Actions qui suppriment des notifications

| Action | Route | Condition | Notifications supprimées | Identifiant utilisé |
| --- | --- | --- | --- | --- |
| Ne plus suivre un utilisateur | `DELETE /user/unfollow-user/{id}` | Une relation de suivi existante est supprimée. | La notification `FOLLOW` correspondant au suivi supprimé. | `recipientId + initiatorId + groupKey` (`targetId` nul) |
| Bloquer un utilisateur | `POST /user/block-user/{id}` | Le blocage supprime les relations de suivi existantes dans les deux directions. | Les notifications `FOLLOW` associées à chaque relation supprimée : une pour le suivi de l’utilisateur authentifié vers la cible et une pour le suivi inverse, si elles existent. | `recipientId + initiatorId + groupKey` (`targetId` nul) |
| Retirer son like d’un post | `DELETE /content/unlike-post/{postId}` | Un like existant est supprimé. | La notification `POST_LIKE` correspondant à ce like. | `targetId` du post + `initiatorId` + `groupKey` |
| Retirer son like d’un commentaire | `DELETE /content/unlike-comment/{commentId}` | Un like existant est supprimé. | La notification `COMMENT_LIKE` correspondant à ce like. | `targetId` du commentaire + `initiatorId` + `groupKey` |
| Supprimer un commentaire | `DELETE /content/delete-comment/{id}` | Le commentaire n’est pas déjà supprimé et est marqué comme supprimé. | Uniquement sa notification de création (`POST_COMMENT` ou `COMMENT_REPLY`). Les notifications de likes et des réponses restent conservées. | `targetId` du commentaire |

La suppression d’un post avec `DELETE /content/delete-post/{postId}` ne supprime aucune notification existante.

### Points d’entrée internes de suppression

Suppression ciblée :

- `POST /internal/notification/remove-notification`
- Reçoit `eventType`, `recipientId`, `initiatorId`, `targetId` et `groupKey`.
- Supprime la notification correspondante si elle existe.
- Décrémente le compteur non vu uniquement si la notification supprimée n’était pas déjà vue.

## Fichiers appelants

### Service utilisateur

- Création d’un `FOLLOW` : `backend/services/user/src/features/user/routes/follow-user.route.ts`
- Suppression d’un `FOLLOW` lors d’un unfollow : `backend/services/user/src/features/user/routes/unfollow-user.route.ts`
- Suppression des `FOLLOW` lors d’un blocage : `backend/services/user/src/features/user/routes/block-user.route.ts`

### Service contenu

- Création d’un `POST_LIKE` : `backend/services/content/src/features/posts/routes/like-post.route.ts`
- Suppression d’un `POST_LIKE` : `backend/services/content/src/features/posts/routes/unlike-post.route.ts`
- Création d’un `COMMENT_LIKE` : `backend/services/content/src/features/comments/routes/like-comment.route.ts`
- Suppression d’un `COMMENT_LIKE` : `backend/services/content/src/features/comments/routes/unlike-comment.route.ts`
- Création d’un `POST_COMMENT` ou `COMMENT_REPLY` : `backend/services/content/src/features/comments/routes/create-comment.route.ts`
- Suppression de la notification d’un commentaire : `backend/services/content/src/features/comments/routes/delete-comment.route.ts`
- Suppression d’un post sans suppression de ses notifications : `backend/services/content/src/features/posts/routes/delete-post.route.ts`

## À ne pas confondre avec une suppression

`PATCH /notification/mark-notifications-seen` marque toutes les notifications de l’utilisateur authentifié comme vues et remet son compteur non vu à zéro. Cette action ne supprime aucune notification de la base de données.
