import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:jysuXvKLDhmYuyKZSLYQxSzU@localhost:5433/postgres";

const client = postgres(connectionString);

export const db = drizzle(client, { schema });

export * from "./schema";
