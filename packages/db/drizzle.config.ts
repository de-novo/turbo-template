import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/schema/index.ts",
  dbCredentials: {
    url: databaseUrl ?? "postgres://postgres:postgres@localhost:5432/fullstack_template",
  },
  verbose: true,
  strict: true,
});
