import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "csv-parse/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const RAW_DIR = join(__dirname, "..", "..", "data", "raw");

/** Read a CSV from data/raw as an array of column-keyed records. */
export function readCsv(filename: string): Record<string, string>[] {
  const text = readFileSync(join(RAW_DIR, filename), "utf8");
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false, // we trim explicitly where needed via normalize.clean
  }) as Record<string, string>[];
}
