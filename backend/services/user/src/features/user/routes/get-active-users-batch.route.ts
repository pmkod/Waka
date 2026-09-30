import { createRoute, defineOpenAPIRoute, z } from "@hono/zod-openapi";
import { HttpStatus } from "@/core/constants/http-status";
import { prisma } from "@/core/databases";
import type { HonoEnv } from "@/core/types/hono-env";
import { removeDuplicateStrings } from "@/core/utils/array.utils";
import { UserRoutesTag } from "../user.constants";

const GetActiveUsersBatchRequestBody = z.object({
	userIds: z.array(z.string().nonempty()).openapi({
		example: ["user-123", "user-456"],
		description: "List of active user IDs to retrieve",
	}),
});

const routeDef = createRoute({
	method: "post",
	path: "/internal/user/get-active-users-batch",
	summary: "Get multiple active users by their IDs in batch",
	tags: [UserRoutesTag],
	request: {
		body: {
			content: {
				"application/json": {
					schema: GetActiveUsersBatchRequestBody,
				},
			},
		},
	},
	responses: {
		[HttpStatus.OK.code]: {
			description: "List of matched active users",
		},
	},
});

const getActiveUsersBatchRoute = defineOpenAPIRoute<typeof routeDef, HonoEnv>({
	route: routeDef,
	handler: async (c) => {
		let { userIds } = c.req.valid("json");
		userIds = removeDuplicateStrings(userIds);

		if (userIds.length === 0) {
			return c.json({ users: [] });
		}

		const users = await prisma.user.findMany({
			where: {
				id: { in: userIds },
				active: true,
			},
			select: {
				id: true,
				username: true,
				fullName: true,
				lowQualityProfilePictureFile: {
					select: { filename: true },
				},
				bestQualityProfilePictureFile: {
					select: { filename: true },
				},
			},
		});

		return c.json({ users });
	},
});

export { getActiveUsersBatchRoute };
