import { Configurations } from "../configurations";
import { internalHttpClient } from "../http-clients/internal.http-client";

type UserProfileFileDto = {
	filename: string;
};

type FetchActiveUsersBatchResponse = {
	users: {
		id: string;
		username: string;
		fullName?: string | null;
		lowQualityProfilePictureFile?: UserProfileFileDto | null;
		bestQualityProfilePictureFile?: UserProfileFileDto | null;
	}[];
};

type FetchActiveUserResponse = {
	user: {
		id: string;
		username: string;
		fullName?: string | null;
		lowQualityProfilePictureFile?: UserProfileFileDto | null;
		bestQualityProfilePictureFile?: UserProfileFileDto | null;
	} | null;
};

type BlockRelationshipIdsDto = {
	blockedUserIds: string[];
	blockedByUserIds: string[];
};

const userServiceHttpClient = internalHttpClient.extend({
	prefix: Configurations.server.userServiceUrl,
});

const userServiceClient = {
	async fetchActiveUser(userId: string): Promise<FetchActiveUserResponse> {
		return await userServiceHttpClient
			.get(`internal/user/get-active-user/${encodeURIComponent(userId)}`)
			.json<FetchActiveUserResponse>();
	},

	async fetchActiveUsersBatch(
		userIds: string[],
	): Promise<FetchActiveUsersBatchResponse> {
		return await userServiceHttpClient
			.post("internal/user/get-active-users-batch", {
				json: { userIds: userIds },
			})
			.json<FetchActiveUsersBatchResponse>();
	},

	async checkBlockRelationships(
		userId: string,
		otherUserIds: string[],
	): Promise<BlockRelationshipIdsDto> {
		try {
			return await userServiceHttpClient
				.post("internal/user/check-block-relationships", {
					json: { userId, otherUserIds },
				})
				.json<BlockRelationshipIdsDto>();
		} catch (error) {
			console.error(
				"[UserServiceClient] Failed to check block relationships:",
				error,
			);
			return { blockedUserIds: [], blockedByUserIds: [] };
		}
	},

	async hasBlockRelationship(userId: string, otherUserId: string) {
		if (userId === otherUserId) return false;
		const relationships = await this.checkBlockRelationships(userId, [otherUserId]);
		return (
			relationships.blockedUserIds.includes(otherUserId) ||
			relationships.blockedByUserIds.includes(otherUserId)
		);
	},

	async fetchFollowingIds(userId: string) {
		return await userServiceHttpClient
			.get(`internal/user/get-following-ids/${encodeURIComponent(userId)}`)
			.json<{ userIds: string[] }>();
	},

	async updatePostCount({
		userId,
		delta,
	}: {
		userId: string;
		delta: -1 | 1;
	}): Promise<void> {
		await userServiceHttpClient.patch(
			`internal/user/update-post-count/${encodeURIComponent(userId)}`,
			{ json: { delta } },
		);
	},
};

export { userServiceClient };
