import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { ExceptionCodes } from "@/core/exceptions/exception.codes";
import { Exception } from "@/core/exceptions/exception";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { PostsRoutesTag } from "../posts.constants";
import {
	hydratePostMediaFiles,
	postMediaWithFileIdsSelect,
} from "../services/post-media-files.service";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-post-by-id/{id}",
	summary: "Get single post by ID",
	tags: [PostsRoutesTag],
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "Post details with medias and author",
		},
		[HttpStatus.NOT_FOUND.code]: { description: "Post not found" },
	},
});

const getPostByIdRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoEnv
>({
	route: routeDef,
	handler: async (c) => {
		const { id } = c.req.valid("param");

		const post = await prisma.post.findFirst({
			where: { id, exists: true },
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

		if (!post) {
			throw new Exception({
				code: ExceptionCodes.post_not_found,
				message: "Post not found",
				status: HttpStatus.NOT_FOUND.code,
			});
		}
		const [hydratedPost] = await hydratePostMediaFiles([post]);

		const authenticatedUser = c.get("authenticatedUser");
		const authenticatedUserId = authenticatedUser?.id;
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
					code: ExceptionCodes.post_not_found,
					message: "Post not found",
					status: HttpStatus.NOT_FOUND.code,
				});
			}
		}
		const like = authenticatedUserId
			? await prisma.postLike.findUnique({
					where: {
						postId_authorId: {
							postId: id,
							authorId: authenticatedUserId,
						},
					},
					select: { postId: true },
				})
			: null;
		const bookmark = authenticatedUserId
			? await prisma.bookmark.findUnique({
					where: {
						postId_ownerId: {
							postId: id,
							ownerId: authenticatedUserId,
						},
					},
						select: {
							postId: true,
							collectionItems: { select: { collectionId: true } },
						},
				})
			: null;
		const { user: author } = await userServiceClient.fetchActiveUser(
			post.authorId,
		);

		return c.json({
			post: {
				...hydratedPost,
				isLikedByAuthenticatedUser: Boolean(like),
				isBookmarkedByAuthenticatedUser: Boolean(
					bookmark?.collectionItems.length,
				),
				author,
			},
		});
	},
});

export { getPostByIdRoute };
