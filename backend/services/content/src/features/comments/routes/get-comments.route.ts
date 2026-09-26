import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { uniqueValues } from "@/core/functions/collection.functions";
import type { Prisma } from "@/generated/prisma/client";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { CommentsRoutesTag } from "../comments.constants";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-comments",
	summary: "Get comments or replies for a post",
	tags: [CommentsRoutesTag],
	request: {
		query: z.object({
			postId: z.string(),
			parentCommentId: z.string().optional(),
			page: z.string().optional().default("1"),
			limit: z.string().optional().default("7"),
		}),
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "List of comments with authors",
		},
	},
});

const getCommentsRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoEnv
>({
	route: routeDef,
	handler: async (c) => {
		const query = c.req.valid("query");
		const { postId, parentCommentId } = query;
		const page = Number.parseInt(query.page, 10) || 1;
		const limit = Number.parseInt(query.limit, 10) || 20;
		const skip = (page - 1) * limit;
		const authenticatedUser = c.get("authenticatedUser");
		const authenticatedUserId = authenticatedUser?.id;
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
		if (!post) {
			return c.json({
				data: [],
				pagination: { total: 0, page, limit, totalPages: 0 },
			});
		}
		if (authenticatedUserId && authenticatedUserId !== post.authorId) {
			const relationships = await userServiceClient.checkBlockRelationships(
				authenticatedUserId,
				[post.authorId],
			);
			if (
				relationships.blockedUserIds.includes(post.authorId) ||
				relationships.blockedByUserIds.includes(post.authorId)
			) {
				return c.json({
					data: [],
					pagination: { total: 0, page, limit, totalPages: 0 },
				});
			}
		}

		const commentsWhere = {
			postId,
			parentId: parentCommentId ? parentCommentId : null,
		};

		const comments = await prisma.comment.findMany({
			where: commentsWhere,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			select: commentSelect,
		});
		const total = await prisma.comment.count({ where: commentsWhere });
		const authorIds = uniqueValues(comments.map((comment) => comment.authorId));
		const [authorsResponse, likedComments] = await Promise.all([
			userServiceClient.fetchActiveUsersBatch(authorIds),
			authenticatedUserId && comments.length > 0
				? prisma.commentLike.findMany({
						where: {
							authorId: authenticatedUserId,
							commentId: { in: comments.map((comment) => comment.id) },
						},
						select: { commentId: true },
					})
				: Promise.resolve([]),
		]);
		const likedCommentIds = new Set(
			likedComments.map((like) => like.commentId),
		);
		const enrichedComments = comments.map((comment) => {
			const isDeleted = !comment.exists;
			return {
				...comment,
				content: isDeleted ? "" : comment.content,
				isDeleted,
				isLikedByAuthenticatedUser:
					!isDeleted && likedCommentIds.has(comment.id),
				author:
					authorsResponse.users.find(
						(author) => author.id === comment.authorId,
					) ?? null,
			};
		});

		return c.json({
			data: enrichedComments,
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		});
	},
});

export { getCommentsRoute };
