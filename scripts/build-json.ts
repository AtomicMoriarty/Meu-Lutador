// Run the entire pipeline purely in-memory (no DB) and emit JSON files under
// data/build/. These get pushed to GitHub and pulled into Postgres server-side
// (the container can't reach Supabase directly).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildDataset } from "./ingest.js";
import { computeRatings } from "./elo.js";
import { computeAttributeRows } from "./attributes.js";
import { buildCharismaRows } from "./charisma.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "build");

const CHUNK = 5000;

type TableManifest = {
  table: string;
  conflict: string | null; // null => truncate+insert only (no upsert key)
  record_cols: string; // "col type, col type, ..." for jsonb_to_recordset
  files: string[];
  count: number;
};

const RECORD_COLS: Record<string, string> = {
  fighters:
    "id uuid, ufcstats_id text, name text, first_name text, last_name text, nickname text, dob date, height_cm numeric, reach_cm numeric, weight_lbs numeric, stance text, source_url text",
  events:
    "id uuid, ufcstats_id text, name text, ufc_number int, event_date date, location text",
  fights:
    "id uuid, ufcstats_fight_id text, event_id uuid, bout text, weight_class text, weight_class_raw text, fighter_a_id uuid, fighter_b_id uuid, winner_id uuid, outcome text, method text, round int, time_seconds int, time_format text, referee text, has_round_stats boolean",
  fight_round_stats:
    "fight_id uuid, fighter_id uuid, round_num int, knockdowns int, sig_str_landed int, sig_str_att int, total_str_landed int, total_str_att int, td_landed int, td_att int, sub_att int, reversals int, control_time_seconds int, sig_head_landed int, sig_head_att int, sig_body_landed int, sig_body_att int, sig_leg_landed int, sig_leg_att int, sig_distance_landed int, sig_distance_att int, sig_clinch_landed int, sig_clinch_att int, sig_ground_landed int, sig_ground_att int",
  fighter_ratings:
    "fighter_id uuid, elo numeric, peak_elo numeric, n_fights int, wins int, losses int, draws int, no_contests int, overall_0_100 numeric, last_fight_date date",
  attribute_scores:
    "fighter_id uuid, weight_class text, era_window_id text, attribute_name text, value_0_100 numeric, raw_value numeric, confidence text",
  charisma_scores:
    "fighter_id uuid, value_0_100 numeric, curated_by text, source_notes text",
  ingest_unresolved:
    "csv_source text, event text, bout text, fighter_name text, reason text",
};

function writeTable(table: string, rows: unknown[], conflict: string | null): TableManifest {
  const files: string[] = [];
  if (rows.length === 0) {
    const f = `${table}.000.json`;
    writeFileSync(join(OUT, f), "[]");
    files.push(f);
  }
  for (let i = 0, part = 0; i < rows.length; i += CHUNK, part++) {
    const f = `${table}.${String(part).padStart(3, "0")}.json`;
    writeFileSync(join(OUT, f), JSON.stringify(rows.slice(i, i + CHUNK)));
    files.push(f);
  }
  return { table, conflict, record_cols: RECORD_COLS[table]!, files, count: rows.length };
}

function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  console.log("buildDataset()...");
  const ds = buildDataset();
  console.log("computeRatings()...");
  const ratings = computeRatings(ds.fights, ds.events);
  const eloOf = new Map(ratings.map((r) => [r.fighter_id, r.elo]));
  console.log("computeAttributeRows()...");
  const attributes = computeAttributeRows(ds.fights, ds.roundStats, eloOf);
  console.log("buildCharismaRows()...");
  const { rows: charisma, misses } = buildCharismaRows(ds.fighters);

  // FK-safe order.
  const manifest: TableManifest[] = [
    writeTable("fighters", ds.fighters, "ufcstats_id"),
    writeTable("events", ds.events, "id"),
    writeTable("fights", ds.fights, "id"),
    writeTable("fight_round_stats", ds.roundStats, "fight_id,fighter_id,round_num"),
    writeTable("fighter_ratings", ratings, "fighter_id"),
    writeTable("attribute_scores", attributes, "fighter_id,weight_class,era_window_id,attribute_name"),
    writeTable("charisma_scores", charisma, "fighter_id"),
    writeTable("ingest_unresolved", ds.unresolved, null),
  ];

  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n=== build summary ===");
  for (const t of manifest) console.log(`  ${t.table.padEnd(20)} ${String(t.count).padStart(6)} rows  ${t.files.length} file(s)`);
  const byConf = attributes.reduce((a, r) => ((a[r.confidence] = (a[r.confidence] ?? 0) + 1), a), {} as Record<string, number>);
  console.log("  attribute confidence:", byConf);
  console.log(`  charisma matched: ${charisma.length}, unmatched: ${misses.length}`);
  if (misses.length) console.log("   misses:", misses.join("; "));
  console.log("\nWrote JSON to data/build/. Commit + push, then load server-side.");
}

main();
