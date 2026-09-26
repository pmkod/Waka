import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { ExceptionCodes } from "@/core/exceptions/exception.codes";
import { Exception } from "@/core/exceptions/exception";
import { uniqueValues } from "@/core/functions/collection.functions";
import type { Prisma } from "@/generated/prisma/client";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { CommentsRoutesTag } from "../comments.constants";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-comment-by-id/{postId}/{commentId}",
	summary: "Get a comment and its parent thread",
	tags: [CommentsRoutesTag],
	request: {
		params: z.object({
			postId: z.string(),
			commentId: z.string(),
		}),
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "Comment details with its parent comments",
		},
		[HttpStatus.NOT_FOUND.code]: { description: "Comment not found" },
	},
});

const getCommentByIdRoute = defineOpenAPIRoute<typeof routeDef, HonoEnv>({
	route: routeDef,
	handler: async (c) => {
		const { postId, commentId } = c.req.valid("param");
		const commentSelect = {
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
	} satisfies Prisma.CommentSelect;
		const post = await prisma.post.findFirst({
			where: { id: postId, exists: true },
			select: { authorId: true },
		});
		const comment = await prisma.comment.findFirst({
			where: { id: commentId, postId },
			select: commentSelect,
		});

		if (!post || !comment) {
			throw new Exception({
				code: ExceptionCodes.comment_not_found,
				message: "Comment not found",
				status: HttpStatus.NOT_FOUND.code,
			});
		}

		const authenticatedUserId = c.get("authenticatedUser")?.id;
		if (authenticatedUserId && authenticatedUserId !== post.authorId) {
			const relationships = await userServiceClient.checkBlockRelationships(
				authenticatedUserId,
				[post.authorId],
			);
			if (
				relationships.blockedUserIds.includes(post.authorId) ||
				relationships.blockedByUserIds.includes(post.authorId)
			) {
				throw new Exception({
					code: ExceptionCodes.comment_not_found,
					message: "Comment not found",
					status: HttpStatus.NOT_FOUND.code,
				});
			}
		}

		const parentComments: Array<typeof comment> = [];
		const visitedCommentIds = new Set([comment.id]);
		let parentId = comment.parentId;

		while (parentId && !visitedCommentIds.has(parentId)) {
			visitedCommentIds.add(parentId);
			const parentComment = await prisma.comment.findFirst({
				where: { id: parentId, postId },
				select: commentSelect,
			});
			if (!parentComment) break;
			parentComments.unshift(parentComment);
			parentId = parentComment.parentId;
		}

		const commentsToPresent = [comment, ...parentComments];
		const authorIds = uniqueValues(
			commentsToPresent.map((currentComment) => currentComment.authorId),
		);
		const [authorsResponse, likedComments] = await Promise.all([
			userServiceClient.fetchActiveUsersBatch(authorIds),
			authenticatedUserId
				? prisma.commentLike.findMany({
						where: {
							authorId: authenticatedUserId,
							commentId: {
								in: commentsToPresent.map((currentComment) => currentComment.id),
							},
						},
						select: { commentId: true },
					})
				: Promise.resolve([]),
		]);
		const likedCommentIds = new Set(
			likedComments.map((like) => like.commentId),
		);
		const [presentedComment, ...presentedParents] = commentsToPresent.map(
			(currentComment) => {
				const isDeleted = !currentComment.exists;
				return {
					...currentComment,
					content: isDeleted ? "" : currentComment.content,
					isDeleted,
					isLikedByAuthenticatedUser:
						!isDeleted && likedCommentIds.has(currentComment.id),
					author:
						authorsResponse.users.find(
							(author) => author.id === currentComment.authorId,
						) ?? null,
				};
			},
		);

		return c.json({
			comment: presentedComment,
			parentComments: presentedParents,
		});
	},
});

export { getCommentByIdRoute };
