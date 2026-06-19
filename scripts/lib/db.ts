import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill them in."
  );
}

// Service-role client targeting the meu_lutador schema. Bypasses RLS; used only
// for the one-off data pipeline, never shipped to a client.
export const db = createClient(url, key, {
  db: { schema: "meu_lutador" },
  auth: { persistSession: false },
});

/** Read every row of a table/column-set, paging past the REST 1000-row cap. */
export async function fetchAll<T = Record<string, unknown>>(
  table: string,
  columns: string,
  page = 1000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + page - 1);
    if (error) throw new Error(`fetchAll ${table} failed: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < page) break;
  }
  return out;
}

/** Upsert rows in batches over the REST API (Postgres ports are blocked here). */
export async function upsertBatched<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 500
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await (db.from(table) as any).upsert(batch, { onConflict });
    if (error) {
      throw new Error(
        `upsert ${table} [${i}..${i + batch.length}] failed: ${error.message}`
      );
    }
    process.stdout.write(
      `  ${table}: ${Math.min(i + batch.length, rows.length)}/${rows.length}\r`
    );
  }
  process.stdout.write("\n");
}
