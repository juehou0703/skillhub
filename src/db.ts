import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://skillhub:skillhub_dev@localhost:5433/skillhub";

const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export default sql;

// Health check
export async function dbHealthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
