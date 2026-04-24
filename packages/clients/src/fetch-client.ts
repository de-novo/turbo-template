import type { ApiResponse } from "@repo/contracts";
import { AppError } from "@repo/platform";
import type { z } from "zod";

export type FetchClientOptions = {
  baseUrl: string;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  fetchImpl?: typeof fetch;
};

export type RequestOptions<TSchema extends z.ZodType> = Omit<RequestInit, "body"> & {
  body?: unknown;
  responseSchema: TSchema;
};

export function createFetchClient(options: FetchClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<TSchema extends z.ZodType>(
    path: string,
    requestOptions: RequestOptions<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const { body, responseSchema, ...init } = requestOptions;
    const headers = new Headers(await options.getHeaders?.());
    headers.set("content-type", "application/json");

    const requestInit: RequestInit = {
      ...init,
      headers,
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetchImpl(new URL(path, options.baseUrl), requestInit);

    const payload = (await response.json()) as ApiResponse<unknown>;

    if (!payload.ok) {
      const errorOptions = {
        code: payload.error.code,
        message: payload.error.message,
      };

      throw new AppError(
        payload.error.details ? { ...errorOptions, details: payload.error.details } : errorOptions,
      );
    }

    return responseSchema.parse(payload.data);
  }

  return { request };
}
