export const projectConfig = {
  packageScope: "@repo",
  projectName: "Fullstack TypeScript Template",
  projectSlug: "fullstack-typescript-template",
  projectTimezone: "Asia/Seoul",
} as const;

export type ProjectConfig = typeof projectConfig;
