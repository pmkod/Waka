import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import {
	NotificationEventTypes,
	NotificationGroupKeyBuilder,
	notificationServiceClient,
} from "@/core/service-clients/notification-service.client";
import type { HonoAuthenticatedEnv } from "@/core/types/hono-authenticated-env";
import { requireUserAuthentication } from "@/features/authentication/middlewares/require-user-authentication.middleware";
import { CommentsRoutesTag } from "../comments.constants";

const routeDef = createRoute({
	method: "delete",
	path: "/content/delete-comment/{id}",
	summary: "Delete a comment",
	tags: [CommentsRoutesTag],
	middleware: [requireUserAuthentication],
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "Comment deleted",
		},
	},
});

const deleteCommentRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoAuthenticatedEnv
>({
	route: routeDef,
	handler: async (c) => {
		const authenticatedUserId = c.get("authenticatedUser").id;

		const { id } = c.req.valid("param");

		const comment = await prisma.comment.update({
			where: { id, authorId: authenticatedUserId, exists: true },
			data: { exists: false },
			select: {
				id: true,
				authorId: true,
				postId: true,
				parentId: true,
				post: { select: { authorId: true } },
				parent: { select: { authorId: true } },
			},
		});

		await prisma.post.update({
			where: { id: comment.postId, exists: true },
			data: { commentsCount: { decrement: 1 } },
		});

		const eventType = comment.parentId
			? NotificationEventTypes.COMMENT_REPLY
			: NotificationEventTypes.POST_COMMENT;
		const groupKey = comment.parentId
			? NotificationGroupKeyBuilder.buildCommentReply(
					comment.parentId,
					comment.postId,
				)
			: NotificationGroupKeyBuilder.buildPostComment(comment.postId);
		const recipientId = comment.parentId
			? comment.parent?.authorId
			: comment.post.authorId;

		if (recipientId) {
			await notificationServiceClient.removeNotification({
				recipientId,
				initiatorId: comment.authorId,
				eventType,
				targetId: comment.id,
				groupKey,
			});
		}

		return c.json({ message: "Comment deleted successfully" });
	},
});

export { deleteCommentRoute };
