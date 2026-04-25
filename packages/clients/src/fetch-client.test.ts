import { expect, test } from "vitest";
import { z } from "zod";
import { createFetchClient } from "./fetch-client.js";

test("createFetchClient exposes a request method", () => {
  const client = createFetchClient({ baseUrl: "https://example.test/" });
  expect(typeof client.request).toBe("function");
});

test("fetch-client decodes the data payload of a successful envelope", async () => {
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ ok: true, data: { id: "abc" } }), {
      headers: { "content-type": "application/json" },
      status: 200,
    })) as typeof fetch;

  const client = createFetchClient({ baseUrl: "https://example.test/", fetchImpl });
  const result = await client.request("/things", {
    responseSchema: z.object({ id: z.string() }),
  });

  expect(result.id).toBe("abc");
});
