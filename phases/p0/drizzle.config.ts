import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/shared/db/schema.ts",
  out: "./packages/shared/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/jobplatform",
  },
});
