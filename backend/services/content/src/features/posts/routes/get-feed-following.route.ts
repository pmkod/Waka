import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { uniqueValues } from "@/core/functions/collection.functions";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { PostsRoutesTag } from "../posts.constants";
import {
	hydratePostMediaFiles,
	postMediaWithFileIdsSelect,
} from "../services/post-media-files.service";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-feed-following",
	summary: "Get following feed with cursor pagination and counts",
	tags: [PostsRoutesTag],
	request: {
		query: z
			.object({
				authorId: z.string().optional(),
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
		[HttpStatus.OK.code]: {
			description:
				"List of posts from following feed with medias, authors and cursor pagination metadata",
		},
	},
});

const getFeedFollowingRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoEnv
>({
	route: routeDef,
	handler: async (c) => {
		const query = c.req.valid("query");
		const limit = Math.min(
			Math.max(Number.parseInt(query.limit, 10) || 10, 1),
			50,
		);
		const authenticatedUser = c.get("authenticatedUser");
		const authenticatedUserId = authenticatedUser?.id;

		let targetAuthorIds: string[] | undefined;
		if (query.authorId) {
			if (authenticatedUserId) {
				const relationships = await userServiceClient.checkBlockRelationships(
					authenticatedUserId,
					[query.authorId],
				);
				if (
					relationships.blockedUserIds.includes(query.authorId) ||
					relationships.blockedByUserIds.includes(query.authorId)
				) {
					return c.json({
						posts: [],
						pagination: { nextCursor: null, hasNextPage: false, limit },
					});
				}
			}
			targetAuthorIds = [query.authorId];
		} else if (authenticatedUserId) {
			const { userIds: followingIds } =
				await userServiceClient.fetchFollowingIds(authenticatedUserId);
			let hiddenUserIds = new Set<string>();
			if (followingIds.length > 0) {
				const relationships = await userServiceClient.checkBlockRelationships(
					authenticatedUserId,
					followingIds,
				);
				hiddenUserIds = new Set([
					...relationships.blockedUserIds,
					...relationships.blockedByUserIds,
				]);
			}
			const allowedFollowingIds = followingIds.filter(
				(id) => !hiddenUserIds.has(id),
			);
			targetAuthorIds = [authenticatedUserId, ...allowedFollowingIds];
		} else {
			return c.json({
				posts: [],
				pagination: { nextCursor: null, hasNextPage: false, limit },
			});
		}

		if (targetAuthorIds.length === 0) {
			return c.json({
				posts: [],
				pagination: { nextCursor: null, hasNextPage: false, limit },
			});
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
				authorId: { in: targetAuthorIds },
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
		const authorIds = uniqueValues(items.map((post) => post.authorId));

		const { users: authors } = await userServiceClient.fetchActiveUsersBatch(
			authorIds,
		);
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
				author: authors.find((author) => author.id === post.authorId) ?? null,
			})),
			pagination: { nextCursor, hasNextPage, limit },
		});
	},
});

export { getFeedFollowingRoute };
