import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { uniqueValues } from "@/core/functions/collection.functions";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import type { Prisma } from "@/generated/prisma/client";
import { PostsRoutesTag } from "../posts.constants";
import {
	hydratePostMediaFiles,
	postMediaWithFileIdsSelect,
} from "../services/post-media-files.service";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-user-liked-posts/{userId}",
	summary: "Get posts liked by a user",
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
		[HttpStatus.OK.code]: { description: "Posts liked by the user" },
	},
});

const likedPostSelect = {
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
} satisfies Prisma.PostSelect;

const getUserLikedPostsRoute = defineOpenAPIRoute<
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
		const pageSize = limit + 1;
		const posts: Prisma.PostGetPayload<{
			select: typeof likedPostSelect;
		}>[] = [];
		let candidateCursorDate = hasValidCursor ? cursorDate : null;
		let candidateCursorId = hasValidCursor ? query.cursorId : undefined;
		let reachedEnd = false;

		while (posts.length < pageSize && !reachedEnd) {
			const candidateCursorCondition =
				candidateCursorDate && candidateCursorId
					? {
							OR: [
								{ createdAt: { lt: candidateCursorDate } },
								{
									createdAt: candidateCursorDate,
									id: { lt: candidateCursorId },
								},
							],
						}
					: undefined;
			const candidates = await prisma.post.findMany({
				where: {
					exists: true,
					postLikes: { some: { authorId: userId } },
					...(candidateCursorCondition ? candidateCursorCondition : {}),
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: pageSize,
				select: likedPostSelect,
			});

			if (candidates.length === 0) {
				reachedEnd = true;
				continue;
			}

			let hiddenUserIds = new Set<string>();
			if (authenticatedUserId) {
				const relationships = await userServiceClient.checkBlockRelationships(
					authenticatedUserId,
					uniqueValues(candidates.map((post) => post.authorId)),
				);
				hiddenUserIds = new Set([
					...relationships.blockedUserIds,
					...relationships.blockedByUserIds,
				]);
			}

			posts.push(
				...candidates.filter((post) => !hiddenUserIds.has(post.authorId)),
			);
			const lastCandidate = candidates.at(-1);
			if (lastCandidate) {
				candidateCursorDate = lastCandidate.createdAt;
				candidateCursorId = lastCandidate.id;
			}
			reachedEnd = candidates.length < pageSize;
		}

		const pagePosts = posts.slice(0, pageSize);
		const hasNextPage = pagePosts.length > limit;
		const items = hasNextPage ? pagePosts.slice(0, limit) : pagePosts;
		const lastItem = items.at(-1);
		const hydratedItems = await hydratePostMediaFiles(items);
		const nextCursor =
			hasNextPage && lastItem
				? { id: lastItem.id, createdAt: lastItem.createdAt.toISOString() }
				: null;

		const postIds = items.map((post) => post.id);
		const authorIds = uniqueValues(items.map((post) => post.authorId));
		const isSameUser = Boolean(
			authenticatedUserId && authenticatedUserId === userId,
		);

		const { users: authors } = await userServiceClient.fetchActiveUsersBatch(
			authorIds,
		);
		const likedPostIds: string[] =
			authenticatedUserId && postIds.length > 0
				? isSameUser
					? postIds
					: (
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

export { getUserLikedPostsRoute };
