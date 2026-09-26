import { afterEach, expect, spyOn, test } from "bun:test";
import { userServiceClient } from "./user-service.client";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("empty user lists resolve without calling the internal endpoint", async () => {
	const fetch = spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 400 }));
	expect(await userServiceClient.fetchActiveUsersBatch([])).toEqual({ users: [] });
	expect(fetch).not.toHaveBeenCalled();
});

test("batch lookup uses the internal route and structured response", async () => {
	const body = { users: [{ id: "user-id", username: "alice" }] };
	let requestBody: Promise<unknown> | undefined;
		const fetch = spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			requestBody = (input as Request).clone().json();
			return Response.json(body);
		});
	expect(await userServiceClient.fetchActiveUsersBatch(["user-id"])).toEqual(body);
	const request = fetch.mock.calls[0]?.[0] as Request;
	expect(new URL(request.url).pathname).toBe("/internal/user/get-active-users-batch");
	expect(await requestBody).toEqual({ userIds: ["user-id"] });
});
