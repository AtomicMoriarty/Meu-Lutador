// Load the hand-curated charisma / mic-skills scores (plan §5.4: never derived
// from fight stats). Matches curated names to fighter ids by exact name.

import { readCsv } from "./lib/csv.js";
import { fetchAll, upsertBatched } from "./lib/db.js";
import { clean } from "./parse/normalize.js";

export type CharismaRow = {
  fighter_id: string;
  value_0_100: number;
  curated_by: string;
  source_notes: string | null;
};

export function buildCharismaRows(
  fighters: { id: string; name: string }[]
): { rows: CharismaRow[]; misses: string[] } {
  const byName = new Map<string, string[]>();
  for (const f of fighters) {
    const k = (f.name ?? "").toLowerCase();
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(f.id);
  }

  const rows: CharismaRow[] = [];
  const misses: string[] = [];
  for (const r of readCsv("../curated/charisma.csv")) {
    const name = clean(r["name"]);
    if (!name) continue;
    const ids = byName.get(name.toLowerCase());
    if (!ids || ids.length !== 1) {
      misses.push(`${name} (${!ids ? "not found" : ids.length + " matches"})`);
      continue;
    }
    rows.push({
      fighter_id: ids[0]!,
      value_0_100: Number(r["value_0_100"]),
      curated_by: "seed",
      source_notes: clean(r["source_notes"]),
    });
  }
  return { rows, misses };
}

async function main() {
  const fighters = await fetchAll<{ id: string; name: string }>("fighters", "id,name");
  const { rows, misses } = buildCharismaRows(fighters);
  console.log(`Loading ${rows.length} charisma_scores...`);
  await upsertBatched("charisma_scores", rows, "fighter_id");
  if (misses.length) {
    console.log(`Unmatched curated names (${misses.length}):`);
    for (const m of misses) console.log("  - " + m);
  }
  console.log("Done.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
