import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://postgres:jysuXvKLDhmYuyKZSLYQxSzU@localhost:5433/postgres",
  },
  verbose: true,
  strict: false,
});
