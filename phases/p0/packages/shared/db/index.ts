import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get the Drizzle ORM database client.
 * Returns null if DATABASE_URL is not set or the connection fails.
 * Consumers should handle null gracefully (fall back to in-memory storage).
 */
export function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[db] DATABASE_URL not set — running without database persistence");
    return null;
  }

  try {
    const client = postgres(connectionString, { max: 1, idle_timeout: 5 });
    _db = drizzle(client, { schema });
    return _db;
  } catch (e) {
    console.warn("[db] Failed to connect to database — running with in-memory fallback:", e);
    return null;
  }
}

/**
 * Check if the database is available.
 */
export function isDbAvailable(): boolean {
  return getDb() !== null;
}

export { schema };
export * from "./schema";
