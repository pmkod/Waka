import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import { userServiceClient } from "@/core/service-clients/user-service.client";
import type { HonoEnv } from "@/core/types/hono-env";
import { PostsRoutesTag } from "../posts.constants";

const routeDef = createRoute({
	method: "get",
	path: "/content/get-post-likes/{postId}",
	summary: "Get likes for a post",
	tags: [PostsRoutesTag],
	request: {
		params: z.object({
			postId: z.string(),
		}),
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "Likes count and authors",
		},
	},
});

const getPostLikesRoute = defineOpenAPIRoute<
	typeof routeDef,
	HonoEnv
>({
	route: routeDef,
	handler: async (c) => {
		const { postId } = c.req.valid("param");
		const authenticatedUser = c.get("authenticatedUser");
		const authenticatedUserId = authenticatedUser?.id;
		const post = await prisma.post.findFirst({
			where: { id: postId, exists: true },
			select: { authorId: true },
		});
		if (!post) {
			return c.json({ count: 0, likes: [] });
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
				return c.json({ count: 0, likes: [] });
			}
		}

		const likes = await prisma.postLike.findMany({
			where: { postId },
			orderBy: { createdAt: "desc" },
			select: {
				authorId: true,
				createdAt: true,
			},
		});
		const count = await prisma.postLike.count({ where: { postId } });

		return c.json({
			count,
			likes: likes.map((like) => ({ id: like.authorId, ...like })),
		});
	},
});

export { getPostLikesRoute };
