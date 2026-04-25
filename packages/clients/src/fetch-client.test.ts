import { AppError } from "@repo/platform";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createFetchClient } from "./fetch-client.js";

const okResponse = (data: unknown) =>
	new Response(JSON.stringify({ ok: true, data }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});

const errResponse = (code: string, message: string) =>
	new Response(JSON.stringify({ ok: false, error: { code, message } }), {
		status: 400,
		headers: { "content-type": "application/json" },
	});

describe("createFetchClient", () => {
	it("validates the response with the provided schema", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(okResponse({ value: 42 }));
		const client = createFetchClient({
			baseUrl: "http://example.test",
			fetchImpl,
		});
		const result = await client.request("/things", {
			method: "GET",
			responseSchema: z.object({ value: z.number() }),
		});
		expect(result).toEqual({ value: 42 });
		expect(fetchImpl).toHaveBeenCalledOnce();
	});

	it("throws an AppError when the API returns an error envelope", async () => {
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(errResponse("NOT_FOUND", "missing"));
		const client = createFetchClient({
			baseUrl: "http://example.test",
			fetchImpl,
		});
		await expect(
			client.request("/things/1", {
				method: "GET",
				responseSchema: z.unknown(),
			}),
		).rejects.toBeInstanceOf(AppError);
	});

	it("serializes JSON bodies and sets the content-type header", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(okResponse({ ok: true }));
		const client = createFetchClient({
			baseUrl: "http://example.test",
			fetchImpl,
		});
		await client.request("/things", {
			method: "POST",
			body: { name: "hi" },
			responseSchema: z.object({ ok: z.boolean() }),
		});
		const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
		expect(init.body).toBe(JSON.stringify({ name: "hi" }));
		expect((init.headers as Headers).get("content-type")).toBe(
			"application/json",
		);
	});
});
