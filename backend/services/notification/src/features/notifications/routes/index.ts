import { createNotificationRoute } from "./create-notification.route";
import { getNotificationsRoute } from "./get-notifications.route";
import { markNotificationsSeenRoute } from "./mark-notifications-seen.route";
import { removeNotificationRoute } from "./remove-notification.route";

const notificationsRoutes = [
	getNotificationsRoute,
	markNotificationsSeenRoute,
	createNotificationRoute,
	removeNotificationRoute,
];

export { notificationsRoutes };
