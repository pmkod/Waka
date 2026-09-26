import type { NotificationEventType } from "../../../../../shared/notification.constants";
import { NotificationEventTypes } from "../../../../../shared/notification.constants";
import { NotificationGroupKeyBuilder } from "../../../../../shared/notification-group-key.builder";
import { Configurations } from "../configurations";
import { internalHttpClient } from "../http-clients/internal.http-client";

type CreateNotificationInput = {
	recipientId: string;
	initiatorId: string;
	eventType: NotificationEventType;
	targetId?: string;
	groupKey: string;
};

type RemoveNotificationInput = {
	eventType: NotificationEventType;
	recipientId: string;
	initiatorId: string;
	targetId?: string;
	groupKey: string;
};

const notificationServiceHttpClient = internalHttpClient.extend({
	prefix: Configurations.server.notificationServiceUrl,
});

const notificationServiceClient = {
	async createNotification(data: CreateNotificationInput) {
		await notificationServiceHttpClient.post(
			"internal/notification/create-notification",
			{ json: data },
		);
	},

	async removeNotification(data: RemoveNotificationInput) {
		await notificationServiceHttpClient.post(
			"internal/notification/remove-notification",
			{ json: data },
		);
	},
};

export {
	NotificationEventTypes,
	NotificationGroupKeyBuilder,
	notificationServiceClient,
};
