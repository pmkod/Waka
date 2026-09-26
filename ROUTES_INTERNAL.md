# Routes internes

Inventaire des routes HTTP déclarées explicitement sous `/internal/**` dans les services du backend.

## User (`backend/services/user`)

| Méthode | Route | Fonction | Source |
|---|---|---|---|
| `POST` | `/internal/user/check-block-relationships` | Vérifier les relations de blocage entre un utilisateur et plusieurs utilisateurs. | `src/features/user/routes/check-block-relationships.route.ts` |
| `GET` | `/internal/user/get-block-relationship-ids/{userId}` | Récupérer les identifiants des utilisateurs bloqués par cet utilisateur et de ceux qui le bloquent. | `src/features/user/routes/get-block-relationship-ids.route.ts` |


## Notification (`backend/services/notification`)

| Méthode | Route | Fonction | Source |
|---|---|---|---|
| `POST` | `/internal/notification/create-notification` | Créer une notification à la demande d’un autre service. | `src/features/notifications/routes/create-notification.route.ts` |
| `POST` | `/internal/notification/remove-notification` | Supprimer une notification correspondant à un événement annulé. | `src/features/notifications/routes/remove-notification.route.ts` |
