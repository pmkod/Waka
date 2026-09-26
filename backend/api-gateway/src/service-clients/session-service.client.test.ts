import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { sessionServiceClient } from "./session-service.client";

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const originalFetch = globalThis.fetch;

describe("session service failures", () => {
	test.each([401, 404])("rejects invalid credentials with 401 (%s)", async (status) => {
		spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status }));
		await expect(sessionServiceClient.verifySession("session-id", "token"))
			.rejects.toMatchObject({ status: 401 });
	});

	test.each([500, 503])("preserves credentials when the service fails (%s)", async (status) => {
		spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status }));
		await expect(sessionServiceClient.verifySession("session-id", "token"))
			.rejects.toMatchObject({ status: 503 });
	});

	test("preserves credentials on a network failure", async () => {
		spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Connection refused"));
		await expect(sessionServiceClient.verifySession("session-id", "token"))
			.rejects.toMatchObject({ status: 503 });
	});

	test.each([
		{},
		{ session: { id: "session-id", userId: "user-id", active: false } },
		{ session: { id: "different-session", userId: "user-id", active: true } },
		{ session: { id: "session-id", userId: "", active: true } },
	])("rejects malformed successful responses: %j", async (body) => {
		spyOn(globalThis, "fetch").mockResolvedValue(Response.json(body));
		await expect(sessionServiceClient.verifySession("session-id", "token"))
			.rejects.toMatchObject({ status: 503 });
	});

	test("accepts an active matching session", async () => {
		const body = { session: { id: "session-id", userId: "user-id", active: true } };
		let requestBody: Promise<unknown> | undefined;
		const fetch = spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			requestBody = (input as Request).clone().json();
			return Response.json(body);
		});
		expect(await sessionServiceClient.verifySession("session-id", "token")).toEqual(body);
		const request = fetch.mock.calls[0]?.[0] as Request;
		expect(new URL(request.url).pathname).toBe("/internal/session/verify-session");
		expect(await requestBody).toEqual({ id: "session-id", token: "token" });
	});
});
