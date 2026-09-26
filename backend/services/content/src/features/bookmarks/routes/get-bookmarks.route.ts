import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { uniqueValues } from "@/core/functions/collection.functions";
import { ExceptionCodes } from "@/core/exceptions/exception.codes";
import { Exception } from "@/core/exceptions/exception";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoAuthenticatedEnv } from "@/core/types/hono-authenticated-env";
import { requireUserAuthentication } from "@/features/authentication/middlewares/require-user-authentication.middleware";
import {
	hydratePostMediaFiles,
	postMediaWithFileIdsSelect,
} from "@/features/posts/services/post-media-files.service";
import type { Prisma } from "@/generated/prisma/client";
import { BookmarksRoutesTag } from "../bookmarks.constants";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-bookmarks",
	summary:
		"Get the authenticated user's bookmarked posts, optionally filtered by collection",
	tags: [BookmarksRoutesTag],
	middleware: [requireUserAuthentication],
	request: {
		query: z
			.object({
				bookmarkCollectionId: z.string().optional(),
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
		[HttpStatus.OK.code]: { description: "Bookmarked posts" },
	},
});

const bookmarkedPostSelect = {
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

const getBookmarksRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoAuthenticatedEnv
>({
	route: routeDef,
	handler: async (c) => {
		const ownerId = c.get("authenticatedUser").id;
		const query = c.req.valid("query");
		if (query.bookmarkCollectionId) {
			const collection = await prisma.bookmarkCollection.findFirst({
				where: {
					id: query.bookmarkCollectionId,
					ownerId,
				},
				select: { id: true },
			});
			if (!collection) {
				throw new Exception({
					code: ExceptionCodes.collection_not_found,
					message: "Collection not found",
					status: HttpStatus.NOT_FOUND.code,
				});
			}
		}
		const limit = Math.min(
			Math.max(Number.parseInt(query.limit, 10) || 10, 1),
			50,
		);

		const cursorDate = query.cursorCreatedAt
			? new Date(query.cursorCreatedAt)
			: null;
		const hasValidCursor =
			cursorDate !== null &&
			!Number.isNaN(cursorDate.getTime()) &&
			query.cursorId;
		const bookmarkCursorCondition = hasValidCursor
			? {
					OR: [
						{ createdAt: { lt: cursorDate } },
						{ createdAt: cursorDate, postId: { lt: query.cursorId } },
					],
				}
			: undefined;
		const collectionItemCursorCondition = hasValidCursor
			? {
					OR: [
						{ createdAt: { lt: cursorDate } },
						{
							createdAt: cursorDate,
							postId: { lt: query.cursorId },
						},
					],
				}
			: undefined;

		const bookmarkEntries = query.bookmarkCollectionId
			? (
					await prisma.bookmarkCollectionItem.findMany({
						where: {
							collectionId: query.bookmarkCollectionId,
							bookmark: {
								ownerId,
								post: {
									exists: true,
								},
							},
							...(collectionItemCursorCondition
								? collectionItemCursorCondition
								: {}),
						},
						orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
						take: limit + 1,
						select: {
							postId: true,
							createdAt: true,
							bookmark: {
								select: { post: { select: bookmarkedPostSelect } },
							},
						},
					})
				).map((item) => ({
					cursorId: item.postId,
					cursorCreatedAt: item.createdAt,
					post: item.bookmark.post,
				}))
			: (
					await prisma.bookmark.findMany({
						where: {
							ownerId,
							collectionItems: { some: {} },
							post: {
								exists: true,
							},
							...(bookmarkCursorCondition ? bookmarkCursorCondition : {}),
						},
						orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
						take: limit + 1,
						select: {
							postId: true,
							createdAt: true,
							post: { select: bookmarkedPostSelect },
						},
					})
				).map((bookmark) => ({
					cursorId: bookmark.postId,
					cursorCreatedAt: bookmark.createdAt,
					post: bookmark.post,
				}));

		const hasNextPage = bookmarkEntries.length > limit;
		const items = hasNextPage
			? bookmarkEntries.slice(0, limit)
			: bookmarkEntries;
		const hydratedPosts = await hydratePostMediaFiles(
			items.map(({ post }) => post),
		);
		const lastItem = items.at(-1);
		const nextCursor =
			hasNextPage && lastItem
				? {
						id: lastItem.cursorId,
						createdAt: lastItem.cursorCreatedAt.toISOString(),
					}
				: null;

		const postIds = items.map(({ post }) => post.id);
		const authorIds = uniqueValues(items.map(({ post }) => post.authorId));

		const { users: authors } = await userServiceClient.fetchActiveUsersBatch(
			authorIds,
		);
		const likedPostIds: string[] =
			postIds.length > 0
				? (
						await prisma.postLike.findMany({
							where: { authorId: ownerId, postId: { in: postIds } },
							select: { postId: true },
						})
					).map((like) => like.postId)
				: [];

		return c.json({
			posts: hydratedPosts.map((post) => ({
				...post,
				isLikedByAuthenticatedUser: likedPostIds.includes(post.id),
				isBookmarkedByAuthenticatedUser: true,
				author: authors.find((author) => author.id === post.authorId) ?? null,
			})),
			pagination: { nextCursor, hasNextPage, limit },
		});
	},
});

export { getBookmarksRoute };
