import { loadWebEnv } from "@repo/env/apps/web";

export const webEnv = loadWebEnv({
  NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"],
  NEXT_PUBLIC_APP_ENV: process.env["NEXT_PUBLIC_APP_ENV"],
  NEXT_PUBLIC_WEB_URL: process.env["NEXT_PUBLIC_WEB_URL"],
});
