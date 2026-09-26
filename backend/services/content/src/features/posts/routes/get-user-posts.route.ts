import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { PostsRoutesTag } from "../posts.constants";
import {
	hydratePostMediaFiles,
	postMediaWithFileIdsSelect,
} from "../services/post-media-files.service";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-user-posts/{userId}",
	summary: "Get posts created by a user",
	tags: [PostsRoutesTag],
	request: {
		params: z.object({ userId: z.string() }),
		query: z
			.object({
				cursorId: z.string().min(1).optional(),
				cursorCreatedAt: z.string().datetime().optional(),
				limit: z.string().optional().default("10"),
			})
			.refine(
				(query) => Boolean(query.cursorCreatedAt) === Boolean(query.cursorId),
				{ message: "cursorCreatedAt and cursorId must be provided together" },
			),
	},
	responses: {
		[HttpStatus.OK.code]: { description: "User posts" },
	},
});

const getUserPostsRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoEnv
>({
	route: routeDef,
	handler: async (c) => {
		const { userId } = c.req.valid("param");
		const query = c.req.valid("query");
		const limit = Math.min(
			Math.max(Number.parseInt(query.limit, 10) || 10, 1),
			50,
		);
		const authenticatedUser = c.get("authenticatedUser");
		const authenticatedUserId = authenticatedUser?.id;

		if (authenticatedUserId) {
			const relationships = await userServiceClient.checkBlockRelationships(
				authenticatedUserId,
				[userId],
			);
			if (
				relationships.blockedUserIds.includes(userId) ||
				relationships.blockedByUserIds.includes(userId)
			) {
				return c.json({
					posts: [],
					pagination: { nextCursor: null, hasNextPage: false, limit },
				});
			}
		}

		const cursorDate = query.cursorCreatedAt
			? new Date(query.cursorCreatedAt)
			: null;
		const hasValidCursor =
			cursorDate !== null &&
			!Number.isNaN(cursorDate.getTime()) &&
			query.cursorId;
		const cursorCondition = hasValidCursor
			? {
					OR: [
						{ createdAt: { lt: cursorDate } },
						{ createdAt: cursorDate, id: { lt: query.cursorId } },
					],
				}
			: undefined;

		const posts = await prisma.post.findMany({
			where: {
				exists: true,
				authorId: userId,
				...(cursorCondition ? cursorCondition : {}),
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: limit + 1,
			select: {
				id: true,
				authorId: true,
				text: true,
				exists: true,
				likesCount: true,
				commentsCount: true,
				createdAt: true,
				updatedAt: true,
				medias: {
					select: postMediaWithFileIdsSelect,
					orderBy: { position: "asc" },
				},
			},
		});

		const hasNextPage = posts.length > limit;
		const items = hasNextPage ? posts.slice(0, limit) : posts;
		const lastItem = items.at(-1);
		const hydratedItems = await hydratePostMediaFiles(items);
		const nextCursor =
			hasNextPage && lastItem
				? { id: lastItem.id, createdAt: lastItem.createdAt.toISOString() }
				: null;

		const postIds = items.map((post) => post.id);

		const singleAuthor =
			items.length > 0
				? (await userServiceClient.fetchActiveUser(userId)).user
				: null;
		const likedPostIds: string[] =
			authenticatedUserId && postIds.length > 0
				? (
						await prisma.postLike.findMany({
							where: {
								authorId: authenticatedUserId,
								postId: { in: postIds },
							},
							select: { postId: true },
						})
					).map((like) => like.postId)
				: [];
		const bookmarkedPostIds: string[] =
			authenticatedUserId && postIds.length > 0
				? (
						await prisma.bookmark.findMany({
							where: {
								ownerId: authenticatedUserId,
								postId: { in: postIds },
								collectionItems: { some: {} },
							},
							select: { postId: true },
						})
					).map((bookmark) => bookmark.postId)
				: [];
		return c.json({
			posts: hydratedItems.map((post) => ({
				...post,
				isLikedByAuthenticatedUser: likedPostIds.includes(post.id),
				isBookmarkedByAuthenticatedUser: bookmarkedPostIds.includes(post.id),
				author: singleAuthor,
			})),
			pagination: { nextCursor, hasNextPage, limit },
		});
	},
});

export { getUserPostsRoute };
