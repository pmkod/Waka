import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { ExceptionCodes } from "@/core/exceptions/exception.codes";
import { Exception } from "@/core/exceptions/exception";
import {
	NotificationEventTypes,
	NotificationGroupKeyBuilder,
	notificationServiceClient,
} from "@/core/service-clients/notification-service.client";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoAuthenticatedEnv } from "@/core/types/hono-authenticated-env";
import { requireUserAuthentication } from "@/features/authentication/middlewares/require-user-authentication.middleware";
import { CommentsRoutesTag } from "../comments.constants";

const CreateCommentRequestBody = z.object({
	postId: z.string(),
	parentCommentId: z.string().optional(),
	content: z.string().min(1).max(2000),
});

const routeDef = createRoute({
	method: "post",
	path: "/content/create-comment",
	summary: "Add a comment to a post",
	tags: [CommentsRoutesTag],
	middleware: [requireUserAuthentication],
	request: {
		body: {
			content: {
				"multipart/form-data": {
					schema: CreateCommentRequestBody,
				},
			},
		},
	},
	responses: {
		[HttpStatus.CREATED.code]: {
			description: "Comment created",
		},
	},
});

const createCommentRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoAuthenticatedEnv
>({
	route: routeDef,
	handler: async (c) => {
		const authenticatedUserId = c.get("authenticatedUser").id;

		const { postId, parentCommentId, content } = c.req.valid("form");

		const post = await prisma.post.findFirst({
			where: { id: postId, exists: true },
			select: { id: true, authorId: true, text: true },
		});

		if (!post) {
			throw new Exception({
				code: ExceptionCodes.post_not_found,
				message: "Post not found",
				status: HttpStatus.NOT_FOUND.code,
			});
		}
		if (authenticatedUserId !== post.authorId) {
			const relationships = await userServiceClient.checkBlockRelationships(
				authenticatedUserId,
				[post.authorId],
			);
			if (
				relationships.blockedUserIds.includes(post.authorId) ||
				relationships.blockedByUserIds.includes(post.authorId)
			) {
				throw new Exception({
					code: ExceptionCodes.post_not_found,
					message: "Post not found",
					status: HttpStatus.NOT_FOUND.code,
				});
			}
		}

		let parentComment: {
			id: string;
			authorId: string;
			postId: string;
			exists: boolean;
		} | null = null;
		if (parentCommentId) {
			parentComment = await prisma.comment.findFirst({
				where: { id: parentCommentId, postId, exists: true },
				select: {
					id: true,
					authorId: true,
					postId: true,
					exists: true,
				},
			});

			if (!parentComment) {
				throw new Exception({
					code: ExceptionCodes.parent_comment_not_found,
					message: "Parent comment not found",
					status: HttpStatus.NOT_FOUND.code,
				});
			}
		}

		const normalizedContent = content.trim();
		const comment = await prisma.$transaction(async (tx) => {
			const createdComment = await tx.comment.create({
				data: {
					postId,
					parentId: parentComment?.id ?? null,
					authorId: authenticatedUserId,
					content: normalizedContent,
				},
				select: { id: true },
			});
			await tx.post.update({
				where: { id: postId, exists: true },
				data: { commentsCount: { increment: 1 } },
			});
			if (parentComment) {
				await tx.comment.update({
					where: { id: parentComment.id, exists: true },
					data: { repliesCount: { increment: 1 } },
				});
			}
			return createdComment;
		});

		const eventType = parentComment
			? NotificationEventTypes.COMMENT_REPLY
			: NotificationEventTypes.POST_COMMENT;
		const groupKey = parentComment
			? NotificationGroupKeyBuilder.buildCommentReply(parentComment.id, postId)
			: NotificationGroupKeyBuilder.buildPostComment(postId);
		await notificationServiceClient.createNotification({
			recipientId: parentComment?.authorId ?? post.authorId,
			initiatorId: authenticatedUserId,
			eventType,
			targetId: comment.id,
			groupKey,
		});

		const commentToSend = await prisma.comment.findUniqueOrThrow({
			where: {
				id: comment.id,
			},
			select: {
				id: true,
				postId: true,
				authorId: true,
				parentId: true,
				content: true,
				likesCount: true,
				repliesCount: true,
				exists: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		const { user: author } = await userServiceClient.fetchActiveUser(
			authenticatedUserId,
		);

		return c.json(
			{
				message: "Comment created successfully",
				comment: {
					...commentToSend,
					isDeleted: false,
					isLikedByAuthenticatedUser: false,
					author,
				},
			},
			HttpStatus.CREATED.code,
		);
	},
});

export { createCommentRoute };
