# Routes internes

Inventaire des routes HTTP déclarées explicitement sous `/internal/**` dans les services du backend.

## Session (`backend/services/session`)

| Méthode | Route | Fonction | Source |
|---|---|---|---|
| `POST` | `/internal/session/create-session` | Créer une session depuis un service de confiance. | `src/features/sessions/routes/create-session.route.ts` |
| `POST` | `/internal/session/verify-session` | Vérifier les identifiants d’une session active. | `src/features/sessions/routes/verify-session.route.ts` |

## User (`backend/services/user`)

| Méthode | Route | Fonction | Source |
|---|---|---|---|
| `POST` | `/internal/user/check-block-relationships` | Vérifier les relations de blocage entre un utilisateur et plusieurs utilisateurs. | `src/features/user/routes/check-block-relationships.route.ts` |
| `GET` | `/internal/user/get-active-user/{userId}` | Récupérer le profil d’un utilisateur actif. | `src/features/user/routes/get-active-user.route.ts` |
| `POST` | `/internal/user/get-active-users-batch` | Récupérer plusieurs profils d’utilisateurs actifs par identifiants. | `src/features/user/routes/get-active-users-batch.route.ts` |
| `GET` | `/internal/user/get-following-ids/{userId}` | Récupérer les identifiants des utilisateurs suivis. | `src/features/user/routes/get-following-ids.route.ts` |
| `PATCH` | `/internal/user/update-post-count/{userId}` | Incrémenter ou décrémenter le compteur de publications. | `src/features/user/routes/update-post-count.route.ts` |
| `PATCH` | `/internal/user/update-unseen-notifications-count/{userId}` | Modifier ou réinitialiser le compteur de notifications non lues. | `src/features/user/routes/update-unseen-notifications-count.route.ts` |

## Notification (`backend/services/notification`)

| Méthode | Route | Fonction | Source |
|---|---|---|---|
| `POST` | `/internal/notification/create-notification` | Créer une notification à la demande d’un autre service. | `src/features/notifications/routes/create-notification.route.ts` |
| `POST` | `/internal/notification/remove-notification` | Supprimer une notification correspondant à un événement annulé. | `src/features/notifications/routes/remove-notification.route.ts` |

**Total : 12 routes.** Les chemins entre accolades représentent des paramètres d’URL.
