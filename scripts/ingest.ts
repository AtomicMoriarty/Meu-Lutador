// Ingest the 6 ufcstats CSVs into the meu_lutador schema.
//   fighters  <- ufc_fighter_details.csv + ufc_fighter_tott.csv (joined on URL)
//   events    <- ufc_event_details.csv
//   fights    <- ufc_fight_results.csv (participants resolved by name)
//   fight_round_stats <- ufc_fight_stats.csv
// Unresolvable fighter names are logged to ingest_unresolved instead of dropped.

import { readCsv } from "./lib/csv.js";
import { db, upsertBatched } from "./lib/db.js";
import { deterministicUuid } from "./lib/uuid.js";
import {
  clean,
  parseClock,
  parseDate,
  parseHeightToCm,
  parseOfPair,
  parseReachToCm,
  parseUfcNumber,
  parseWeightLbs,
  ufcstatsId,
} from "./parse/normalize.js";
import { normalizeWeightClass } from "./parse/weightclass.js";

function int(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "" || t === "--" || t === "---") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const keyOf = (event: string, bout: string) =>
  `${(clean(event) ?? "").toLowerCase()}||${(clean(bout) ?? "").toLowerCase()}`;

// ---------------------------------------------------------------------------
// 1. Fighters
// ---------------------------------------------------------------------------

export type FighterRow = {
  id: string;
  ufcstats_id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  dob: string | null;
  height_cm: number | null;
  reach_cm: number | null;
  weight_lbs: number | null;
  stance: string | null;
  source_url: string | null;
};

const fighters = new Map<string, FighterRow>(); // ufcstats_id -> row
const nameToIds = new Map<string, Set<string>>(); // lower name -> ufcstats_ids

function addName(name: string | null, ufcId: string) {
  if (!name) return;
  const k = name.toLowerCase();
  if (!nameToIds.has(k)) nameToIds.set(k, new Set());
  nameToIds.get(k)!.add(ufcId);
}

function buildFighters() {
  for (const r of readCsv("ufc_fighter_details.csv")) {
    const id = ufcstatsId(r["URL"]);
    if (!id) continue;
    const first = clean(r["FIRST"]);
    const last = clean(r["LAST"]);
    const name = clean([first, last].filter(Boolean).join(" ")) ?? id;
    fighters.set(id, {
      id: deterministicUuid(id),
      ufcstats_id: id,
      name,
      first_name: first,
      last_name: last,
      nickname: clean(r["NICKNAME"]),
      dob: null,
      height_cm: null,
      reach_cm: null,
      weight_lbs: null,
      stance: null,
      source_url: clean(r["URL"]),
    });
    addName(name, id);
  }

  for (const r of readCsv("ufc_fighter_tott.csv")) {
    const id = ufcstatsId(r["URL"]);
    if (!id) continue;
    let f = fighters.get(id);
    const tottName = clean(r["FIGHTER"]);
    if (!f) {
      f = {
        id: deterministicUuid(id),
        ufcstats_id: id,
        name: tottName ?? id,
        first_name: null,
        last_name: null,
        nickname: null,
        dob: null,
        height_cm: null,
        reach_cm: null,
        weight_lbs: null,
        stance: null,
        source_url: clean(r["URL"]),
      };
      fighters.set(id, f);
    }
    f.dob = parseDate(r["DOB"]);
    f.height_cm = parseHeightToCm(r["HEIGHT"]);
    f.reach_cm = parseReachToCm(r["REACH"]);
    f.weight_lbs = parseWeightLbs(r["WEIGHT"]);
    f.stance = clean(r["STANCE"]);
    addName(tottName, id);
  }
}

const unresolved: {
  csv_source: string;
  event: string | null;
  bout: string | null;
  fighter_name: string | null;
  reason: string;
}[] = [];

function resolveFighterId(
  name: string | null,
  ctx: { source: string; event?: string; bout?: string }
): string | null {
  if (!name) return null;
  const ids = nameToIds.get(name.toLowerCase());
  if (!ids || ids.size === 0) {
    unresolved.push({
      csv_source: ctx.source,
      event: ctx.event ?? null,
      bout: ctx.bout ?? null,
      fighter_name: name,
      reason: "unmatched",
    });
    return null;
  }
  if (ids.size > 1) {
    unresolved.push({
      csv_source: ctx.source,
      event: ctx.event ?? null,
      bout: ctx.bout ?? null,
      fighter_name: name,
      reason: "collision",
    });
    return null;
  }
  const ufcId = [...ids][0]!;
  return fighters.get(ufcId)!.id;
}

// ---------------------------------------------------------------------------
// 2. Events
// ---------------------------------------------------------------------------

export type EventRow = {
  id: string;
  ufcstats_id: string | null;
  name: string;
  ufc_number: number | null;
  event_date: string | null;
  location: string | null;
};

const eventByName = new Map<string, EventRow>(); // lower clean(name) -> row

function buildEvents(): EventRow[] {
  const rows: EventRow[] = [];
  for (const r of readCsv("ufc_event_details.csv")) {
    const name = clean(r["EVENT"]);
    if (!name) continue;
    const ufcId = ufcstatsId(r["URL"]);
    const row: EventRow = {
      id: ufcId ? deterministicUuid("event:" + ufcId) : deterministicUuid("event:" + name),
      ufcstats_id: ufcId,
      name,
      ufc_number: parseUfcNumber(name),
      event_date: parseDate(r["DATE"]),
      location: clean(r["LOCATION"]),
    };
    rows.push(row);
    eventByName.set(name.toLowerCase(), row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3 & 4. Fights + round stats
// ---------------------------------------------------------------------------

export type FightRow = {
  id: string;
  ufcstats_fight_id: string | null;
  event_id: string | null;
  bout: string | null;
  weight_class: string;
  weight_class_raw: string | null;
  fighter_a_id: string | null;
  fighter_b_id: string | null;
  winner_id: string | null;
  outcome: string | null;
  method: string | null;
  round: number | null;
  time_seconds: number | null;
  time_format: string | null;
  referee: string | null;
  has_round_stats: boolean;
};

function splitBout(bout: string | null): [string | null, string | null] {
  if (!bout) return [null, null];
  const parts = bout.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return [null, null];
  return [clean(parts[0]), clean(parts[1])];
}

function timeToSeconds(raw: string | undefined): number | null {
  return parseClock(raw);
}

function buildFights(statKeys: Set<string>) {
  const fights: FightRow[] = [];
  const fightByKey = new Map<string, FightRow>();

  for (const r of readCsv("ufc_fight_results.csv")) {
    const eventName = clean(r["EVENT"]);
    const bout = clean(r["BOUT"]);
    const fightUfcId = ufcstatsId(r["URL"]);
    const ev = eventName ? eventByName.get(eventName.toLowerCase()) : undefined;
    const [aName, bName] = splitBout(bout);

    const aId = resolveFighterId(aName, { source: "fight_results", event: eventName ?? undefined, bout: bout ?? undefined });
    const bId = resolveFighterId(bName, { source: "fight_results", event: eventName ?? undefined, bout: bout ?? undefined });

    const outcome = clean(r["OUTCOME"]); // e.g. "W/L", "L/W", "D/D", "NC"
    let winnerId: string | null = null;
    if (outcome === "W/L") winnerId = aId;
    else if (outcome === "L/W") winnerId = bId;

    const key = keyOf(eventName ?? "", bout ?? "");
    const row: FightRow = {
      id: fightUfcId ? deterministicUuid("fight:" + fightUfcId) : deterministicUuid("fight:" + key),
      ufcstats_fight_id: fightUfcId,
      event_id: ev?.id ?? null,
      bout,
      weight_class: normalizeWeightClass(r["WEIGHTCLASS"]),
      weight_class_raw: clean(r["WEIGHTCLASS"]),
      fighter_a_id: aId,
      fighter_b_id: bId,
      winner_id: winnerId,
      outcome,
      method: clean(r["METHOD"]),
      round: int(r["ROUND"]),
      time_seconds: timeToSeconds(r["TIME"]),
      time_format: clean(r["TIME FORMAT"]),
      referee: clean(r["REFEREE"]),
      has_round_stats: statKeys.has(key),
    };
    fights.push(row);
    fightByKey.set(key, row);
  }
  return { fights, fightByKey };
}

export type UnresolvedRow = {
  csv_source: string;
  event: string | null;
  bout: string | null;
  fighter_name: string | null;
  reason: string;
};

export type RoundStatRow = {
  fight_id: string;
  fighter_id: string;
  round_num: number;
  knockdowns: number | null;
  sig_str_landed: number | null;
  sig_str_att: number | null;
  total_str_landed: number | null;
  total_str_att: number | null;
  td_landed: number | null;
  td_att: number | null;
  sub_att: number | null;
  reversals: number | null;
  control_time_seconds: number | null;
  sig_head_landed: number | null;
  sig_head_att: number | null;
  sig_body_landed: number | null;
  sig_body_att: number | null;
  sig_leg_landed: number | null;
  sig_leg_att: number | null;
  sig_distance_landed: number | null;
  sig_distance_att: number | null;
  sig_clinch_landed: number | null;
  sig_clinch_att: number | null;
  sig_ground_landed: number | null;
  sig_ground_att: number | null;
};

function buildRoundStats(fightByKey: Map<string, FightRow>): RoundStatRow[] {
  const rows: RoundStatRow[] = [];
  const seen = new Set<string>(); // dedupe on PK
  for (const r of readCsv("ufc_fight_stats.csv")) {
    const eventName = clean(r["EVENT"]);
    const bout = clean(r["BOUT"]);
    const fight = fightByKey.get(keyOf(eventName ?? "", bout ?? ""));
    if (!fight) continue;
    const fighterId = resolveFighterId(clean(r["FIGHTER"]), {
      source: "fight_stats",
      event: eventName ?? undefined,
      bout: bout ?? undefined,
    });
    if (!fighterId) continue;
    const roundNum = int((r["ROUND"] ?? "").replace(/round\s*/i, ""));
    if (roundNum == null) continue;

    const pk = `${fight.id}|${fighterId}|${roundNum}`;
    if (seen.has(pk)) continue;
    seen.add(pk);

    const sig = parseOfPair(r["SIG.STR."]);
    const tot = parseOfPair(r["TOTAL STR."]);
    const td = parseOfPair(r["TD"]);
    const head = parseOfPair(r["HEAD"]);
    const body = parseOfPair(r["BODY"]);
    const leg = parseOfPair(r["LEG"]);
    const dist = parseOfPair(r["DISTANCE"]);
    const clinch = parseOfPair(r["CLINCH"]);
    const ground = parseOfPair(r["GROUND"]);

    rows.push({
      fight_id: fight.id,
      fighter_id: fighterId,
      round_num: roundNum,
      knockdowns: int(r["KD"]),
      sig_str_landed: sig.landed,
      sig_str_att: sig.attempted,
      total_str_landed: tot.landed,
      total_str_att: tot.attempted,
      td_landed: td.landed,
      td_att: td.attempted,
      sub_att: int(r["SUB.ATT"]),
      reversals: int(r["REV."]),
      control_time_seconds: parseClock(r["CTRL"]),
      sig_head_landed: head.landed,
      sig_head_att: head.attempted,
      sig_body_landed: body.landed,
      sig_body_att: body.attempted,
      sig_leg_landed: leg.landed,
      sig_leg_att: leg.attempted,
      sig_distance_landed: dist.landed,
      sig_distance_att: dist.attempted,
      sig_clinch_landed: clinch.landed,
      sig_clinch_att: clinch.attempted,
      sig_ground_landed: ground.landed,
      sig_ground_att: ground.attempted,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------

export type Dataset = {
  fighters: FighterRow[];
  events: EventRow[];
  fights: FightRow[];
  roundStats: RoundStatRow[];
  unresolved: UnresolvedRow[];
};

/** Pure CSV -> normalized rows. No DB access (so it runs anywhere). */
export function buildDataset(): Dataset {
  buildFighters();
  const events = buildEvents();
  const statKeys = new Set<string>();
  for (const r of readCsv("ufc_fight_stats.csv")) {
    statKeys.add(keyOf(clean(r["EVENT"]) ?? "", clean(r["BOUT"]) ?? ""));
  }
  const { fights, fightByKey } = buildFights(statKeys);
  const roundStats = buildRoundStats(fightByKey);
  return { fighters: [...fighters.values()], events, fights, roundStats, unresolved };
}

async function main() {
  const { fighters: fighterRows, events, fights, roundStats } = buildDataset();
  console.log(
    `built fighters=${fighterRows.length} events=${events.length} fights=${fights.length} roundStats=${roundStats.length}`
  );

  // Load order respects FKs: fighters & events, then fights, then stats.
  console.log("Loading fighters...");
  await upsertBatched("fighters", fighterRows, "ufcstats_id");
  console.log("Loading events...");
  await upsertBatched("events", events, "id");
  console.log("Loading fights...");
  await upsertBatched("fights", fights, "id");
  console.log("Loading fight_round_stats...");
  await upsertBatched("fight_round_stats", roundStats, "fight_id,fighter_id,round_num");

  // Resolution log (truncate + reload).
  console.log(`Logging ${unresolved.length} unresolved name references...`);
  await db.from("ingest_unresolved").delete().neq("id", 0);
  if (unresolved.length > 0) {
    for (let i = 0; i < unresolved.length; i += 500) {
      const { error } = await db.from("ingest_unresolved").insert(unresolved.slice(i, i + 500));
      if (error) throw new Error("ingest_unresolved insert failed: " + error.message);
    }
  }

  // Summary of resolution quality.
  const unmatched = unresolved.filter((u) => u.reason === "unmatched").length;
  const collisions = unresolved.filter((u) => u.reason === "collision").length;
  console.log("\n=== Ingestion summary ===");
  console.log(`fighters:          ${fighterRows.length}`);
  console.log(`events:            ${events.length}`);
  console.log(`fights:            ${fights.length}`);
  console.log(`fight_round_stats: ${roundStats.length}`);
  console.log(`unresolved refs:   ${unresolved.length} (unmatched=${unmatched}, collision=${collisions})`);
  console.log("Done.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
