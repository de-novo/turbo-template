import { loadMobileEnv } from "@repo/env/apps/mobile";

export const mobileEnv = loadMobileEnv({
  EXPO_PUBLIC_API_URL: process.env["EXPO_PUBLIC_API_URL"],
  EXPO_PUBLIC_APP_ENV: process.env["EXPO_PUBLIC_APP_ENV"],
  EXPO_PUBLIC_MOBILE_URL: process.env["EXPO_PUBLIC_MOBILE_URL"],
});
