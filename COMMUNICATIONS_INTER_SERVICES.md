# Cartographie des communications inter-services

## Périmètre et état actuel

Cette cartographie est issue du code présent dans `backend/`. Elle couvre l'API Gateway et les services User, Content, Report, Notification et Session.

Le service de chat est volontairement exclu.

À ce jour :

- toutes les communications inter-services réellement implémentées utilisent HTTP ; les clients internes dédiés utilisent `ky` et échangent du JSON, tandis que la Gateway relaie les requêtes publiques avec `fetch`, y compris les bodies multipart et binaires ;
- aucun client, serveur ou contrat gRPC n'est présent ;
- aucun producteur ou consommateur Kafka/NATS JetStream n'est présent ;
- les appels marqués **asynchrones** ci-dessous sont donc des recommandations de migration, pas l'état actuel du transport.

La classification cible suit cette règle :

- **Synchrone — gRPC** : l'appelant a besoin de la réponse pour terminer correctement la requête en cours (lecture, authentification, autorisation, création de session, réponse à retourner au client).
- **Asynchrone — Kafka ou NATS JetStream** : propagation d'un fait métier, mise à jour d'une projection ou d'un compteur, création/suppression d'une notification, nettoyage secondaire.

> La frontière publique Client → API Gateway doit rester en HTTP. La recommandation gRPC concerne uniquement le saut interne API Gateway → microservice.

## Vue synthétique

| Producteur | Consommateur | Responsabilité | Cible |
|---|---|---|---|
| API Gateway | Session | Vérifier la session portée par le header d'autorisation | **Synchrone — gRPC** |
| API Gateway | User, Content, Report, Notification, Session | Transmettre une requête publique et retourner sa réponse | **Synchrone — gRPC** |
| User | Session | Créer ou désactiver une session | **Synchrone — gRPC** |
| Content | User | Lire des profils, relations de blocage et abonnements | **Synchrone — gRPC** |
| Notification | User | Lire les profils des initiateurs de notifications | **Synchrone — gRPC** |
| Content | Notification | Créer, supprimer ou nettoyer des notifications | **Asynchrone — Kafka/JetStream** |
| User | Notification | Créer/supprimer les notifications de follow | **Asynchrone — Kafka/JetStream** |
| Content | User | Mettre à jour le compteur de posts | **Asynchrone — Kafka/JetStream** |
| Notification | User | Mettre à jour/réinitialiser le compteur de notifications non vues | **Asynchrone — Kafka/JetStream** |

## Communications synchrones à migrer vers gRPC

### API Gateway → Session

| Appel actuel | Déclencheur | Pourquoi synchrone | RPC cible suggérée |
|---|---|---|---|
| `POST /internal/session/verify-session` | Toute requête publique contenant un header `Authorization` | La Gateway doit authentifier la requête avant de la transmettre | `SessionService.VerifySession` |

Sources : `backend/api-gateway/src/middleware/verify-authorization-header.ts`, `backend/api-gateway/src/service-clients/session-service.client.ts`.

### API Gateway → services métier

La Gateway agit actuellement comme reverse proxy HTTP et conserve la méthode, le chemin, la query, le body et la réponse du service.

| Destination actuelle | Préfixe routé | Cible |
|---|---|---|
| User | `/user/*` | Appels gRPC synchrones vers les RPC User correspondantes |
| Content | `/content/*` | Appels gRPC synchrones ; streaming gRPC à prévoir pour les médias |
| Report | `/report/*` | Appels gRPC synchrones vers les RPC Report correspondantes |
| Notification | `/notification/*` | Appels gRPC synchrones vers les RPC Notification correspondantes |
| Session | `/session/*` | Appels gRPC synchrones vers les RPC Session correspondantes |

Sources : `backend/api-gateway/services.json`, `backend/api-gateway/src/index.ts`, `backend/api-gateway/src/send.ts`.

### User → Session

| Appel actuel | Call sites | Pourquoi synchrone | RPC cible suggérée |
|---|---|---|---|
| `POST /internal/session/create-session` | Fin d'inscription, fin de connexion, définition d'un nouveau mot de passe | Le token et l'identifiant de session sont nécessaires dans la réponse courante | `SessionService.CreateSession` |
| `PATCH /session/disable-session/{sessionId}` | Déconnexion | La requête doit confirmer que la session visée a été désactivée | `SessionService.DisableSession` |

Sources : `backend/services/user/src/core/service-clients/session-service.client.ts` et les routes de `backend/services/user/src/features/authentication/routes/`.

### Content → User

| Appel actuel | Utilisation | Pourquoi synchrone | RPC cible suggérée |
|---|---|---|---|
| `GET /internal/user/get-active-user/{userId}` | Hydratation de l’auteur dans `POST /content/create-post`, `POST /content/create-comment`, `GET /content/get-post-by-id/{id}` et `GET /content/get-user-posts/{userId}` | Le profil est inclus dans la réponse HTTP en cours | `UserService.GetActiveUser` |
| `POST /internal/user/get-active-users-batch` | Hydratation des auteurs actifs dans les réponses de lecture des posts, commentaires et bookmarks | Les profils font partie de la réponse HTTP en cours | `UserService.GetActiveUsersBatch` |
| `GET /internal/user/get-block-relationship-ids/{userId}` | Filtrage des contenus et contrôle avant commentaire | La visibilité/autorisation dépend immédiatement du résultat | `UserService.GetBlockRelationshipIds` ou `UserService.HasBlockRelationship` |
| `GET /internal/user/get-following-ids/{userId}` | Construction du feed « following » | La liste est nécessaire pour exécuter la requête de feed | `UserService.GetFollowingIds` |

Sources : `backend/services/content/src/core/service-clients/user-service.client.ts` et ses usages sous `backend/services/content/src/features/`.

Attention : les erreurs de lecture des relations de blocage retournent actuellement une liste vide. Cela produit un comportement *fail-open* et peut exposer un contenu qui aurait dû être masqué. La migration gRPC doit définir explicitement timeout, indisponibilité et politique *fail-closed* pour ces contrôles.

### Notification → User

| Appel actuel | Utilisation | Pourquoi synchrone | RPC cible suggérée |
|---|---|---|---|
| `POST /internal/user/get-active-users-batch` | Hydratation des initiateurs actifs dans `GET /notification/get-notifications` | Les profils sont inclus dans la réponse courante | `UserService.GetActiveUsersBatch` |

Source : `backend/services/notification/src/core/service-clients/user-service.client.ts`.

À plus long terme, une projection locale des données minimales d'utilisateur dans Notification pourrait supprimer cet appel synchrone. Tant que cette projection n'existe pas, gRPC reste la bonne catégorie.

## Communications asynchrones à migrer vers Kafka ou NATS JetStream

### Content → Notification

Ces appels sont actuellement attendus avec `await`, mais leurs erreurs sont absorbées et n'annulent pas l'action métier déjà enregistrée. Ce sont donc déjà des effets de bord *best effort* qui bloquent inutilement la réponse utilisateur.

| Appel HTTP actuel | Événements métier déclencheurs | Événement asynchrone suggéré |
|---|---|---|
| `POST /internal/notification/create-notification` | Like d'un post | `content.post-liked.v1` |
| `POST /internal/notification/create-notification` | Like d'un commentaire | `content.comment-liked.v1` |
| `POST /internal/notification/create-notification` | Création d'un commentaire ou d'une réponse | `content.comment-created.v1` |
| `POST /internal/notification/remove-notification` | Unlike d'un post | `content.post-unliked.v1` |
| `POST /internal/notification/remove-notification` | Unlike d'un commentaire | `content.comment-unliked.v1` |
| `POST /internal/notification/remove-notification` | Suppression d'un commentaire | `content.comment-deleted.v1` |

Types de notification actuellement produits : `POST_LIKE`, `COMMENT_LIKE`, `POST_COMMENT`, `COMMENT_REPLY`.

Sources : `backend/services/content/src/core/service-clients/notification-service.client.ts` et les routes de likes/commentaires sous `backend/services/content/src/features/`.

Le service Content devrait publier des événements de domaine, sans dépendre des constantes internes de Notification. Notification devient consommateur et décide de créer, dédupliquer ou supprimer ses propres lignes.

### User → Notification

| Appel HTTP actuel | Événement métier déclencheur | Événement asynchrone suggéré |
|---|---|---|
| `POST /internal/notification/create-notification` | Création d'un follow | `user.follow-created.v1` |
| `POST /internal/notification/remove-notification` | Unfollow | `user.follow-deleted.v1` |
| `POST /internal/notification/remove-notification` | Blocage supprimant un follow dans l'un ou l'autre sens | `user.block-created.v1` |

Type de notification actuellement produit : `FOLLOW`.

Sources : `backend/services/user/src/core/service-clients/notification-service.client.ts`, `follow-user.route.ts`, `unfollow-user.route.ts`, `block-user.route.ts`.

### Content → User : compteur de posts

| Appel HTTP actuel | Déclencheur | Événement asynchrone suggéré |
|---|---|---|
| `PATCH /internal/user/update-post-count/{userId}` avec `delta: 1` | Post créé | `content.post-created.v1` |
| `PATCH /internal/user/update-post-count/{userId}` avec `delta: -1` | Post supprimé | `content.post-deleted.v1` |

Source : `backend/services/content/src/core/service-clients/user-service.client.ts`.

`postCount` est une projection dénormalisée dans User. L'action Content ne doit pas échouer ni attendre à cause de cette projection. User consomme l'événement de manière idempotente et met son compteur à jour.

### Notification → User : compteur de notifications non vues

| Appel HTTP actuel | Déclencheur | Événement asynchrone suggéré |
|---|---|---|
| `PATCH /internal/user/update-unseen-notifications-count/{userId}` avec `delta: 1` | Notification effectivement créée après déduplication | `notification.created.v1` |
| Même endpoint avec `delta: -1` | Notification non vue effectivement supprimée | `notification.deleted.v1` |
| Même endpoint avec `reset: true` | Toutes les notifications sont marquées comme vues | `notification.all-seen.v1` |

Sources : `backend/services/notification/src/core/service-clients/user-service.client.ts` et les routes sous `backend/services/notification/src/features/notifications/routes/`.

L'événement doit être publié par Notification **après** le résultat de la déduplication ou de la suppression. Content/User ne peuvent pas mettre ce compteur à jour correctement eux-mêmes, car Notification est le seul service qui sait si une ligne a réellement été créée, supprimée ou si elle était déjà vue.

## Services sans communication inter-service active

### Report

`CONTENT_SERVICE_URL` et `USER_SERVICE_URL` sont configurés dans Report, mais aucune requête vers Content ou User n'est exécutée. `create-report.route.ts` écrit directement le signalement dans sa propre base sans valider l'existence de la cible auprès d'un autre service.

Il s'agit donc de dépendances de configuration inutilisées, pas de communications actuelles.

## Endpoints et dépendances déclarés mais non reliés

- Report déclare les URLs Content et User sans client ni call site.
- Content lit `USER_SERVICE_URL` dans sa configuration, mais cette variable manque dans `backend/services/content/.env.example` ; le fallback `http://localhost:8001` masque actuellement l'oubli.

## Exigences de fiabilité pour les flux asynchrones

Pour éviter de remplacer les erreurs HTTP absorbées par des pertes silencieuses d'événements :

1. publier avec un **Transactional Outbox** dans la même transaction que l'écriture métier ;
2. utiliser une livraison durable *at-least-once* ;
3. rendre chaque consommateur idempotent avec un `eventId` unique ;
4. versionner les schémas (`*.v1`) et inclure au minimum `eventId`, `occurredAt`, `producer`, `aggregateId` et les données métier nécessaires ;
5. prévoir retry avec backoff, dead-letter queue/stream et métriques de lag/échecs ;
6. conserver l'ordre par agrégat quand il est important (clé `postId`, `commentId` ou `userId`) ;
7. ne pas envoyer de token de session ou de donnée sensible inutile dans les événements.

## Ordre de migration conseillé

1. Introduire les contrats protobuf et migrer Session (`VerifySession`, `CreateSession`, `DisableSession`) vers gRPC.
2. Migrer les lectures Content/Notification → User vers gRPC.
3. Mettre en place le broker et l'Outbox, puis migrer les événements de notification.
4. Migrer les compteurs dénormalisés (`postCount`, `unseenNotificationsCount`).
5. Remplacer progressivement le proxy HTTP interne de la Gateway par des adapters gRPC, sans changer l'API HTTP publique.
