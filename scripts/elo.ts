// Chronological Elo over every fight (plan §5.3). Universal "overall" floor that
// covers fighters from UFC 1 onward, including the pre-stats era. This is a
// fallback/baseline, NOT the final quality metric (see FightMatrix critique).

import { fetchAll, upsertBatched } from "./lib/db.js";

const START_ELO = 1500;
const K_NEW = 275; // first 3 fights of a fighter's career
const K_NEW_LIMIT = 3;
const K_EST = 155; // afterwards
const SPLIT_WIN = 0.67; // split-decision score for the winner

export type EloFight = {
  id: string;
  event_id: string | null;
  fighter_a_id: string | null;
  fighter_b_id: string | null;
  winner_id: string | null;
  outcome: string | null;
  method: string | null;
};

export type EloEvent = { id: string; event_date: string | null };

export type RatingRow = {
  fighter_id: string;
  elo: number;
  peak_elo: number;
  n_fights: number;
  wins: number;
  losses: number;
  draws: number;
  no_contests: number;
  overall_0_100: number;
  last_fight_date: string | null;
};

type Rating = {
  elo: number;
  peak: number;
  n: number;
  w: number;
  l: number;
  d: number;
  nc: number;
  lastDate: string | null;
};

const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));
const kOf = (n: number) => (n < K_NEW_LIMIT ? K_NEW : K_EST);
const toOverall = (elo: number) =>
  Math.max(1, Math.min(99, Math.round(50 + (elo - START_ELO) / 8)));

/** Pure Elo computation over the given fights/events. */
export function computeRatings(fights: EloFight[], events: EloEvent[]): RatingRow[] {
  const dateById = new Map(events.map((e) => [e.id, e.event_date]));

  const ordered = [...fights].sort((x, y) => {
    const dx = (x.event_id && dateById.get(x.event_id)) || "9999-12-31";
    const dy = (y.event_id && dateById.get(y.event_id)) || "9999-12-31";
    if (dx !== dy) return dx < dy ? -1 : 1;
    return x.id < y.id ? -1 : 1;
  });

  const r = new Map<string, Rating>();
  const get = (id: string): Rating => {
    let v = r.get(id);
    if (!v) {
      v = { elo: START_ELO, peak: START_ELO, n: 0, w: 0, l: 0, d: 0, nc: 0, lastDate: null };
      r.set(id, v);
    }
    return v;
  };

  for (const f of ordered) {
    if (!f.fighter_a_id || !f.fighter_b_id) continue;
    const a = get(f.fighter_a_id);
    const b = get(f.fighter_b_id);
    const date = (f.event_id && dateById.get(f.event_id)) || null;

    const outcome = f.outcome;
    if (outcome !== "W/L" && outcome !== "L/W" && outcome !== "D/D") {
      a.n++; b.n++; a.nc++; b.nc++;
      a.lastDate = date; b.lastDate = date;
      continue;
    }

    let sA: number;
    if (outcome === "D/D") {
      sA = 0.5;
      a.d++; b.d++;
    } else {
      const winnerIsA = outcome === "W/L";
      const split = !!f.method && /split/i.test(f.method);
      const winScore = split ? SPLIT_WIN : 1;
      sA = winnerIsA ? winScore : 1 - winScore;
      if (winnerIsA) { a.w++; b.l++; } else { a.l++; b.w++; }
    }

    const eA = expected(a.elo, b.elo);
    a.elo += kOf(a.n) * (sA - eA);
    b.elo += kOf(b.n) * (1 - sA - (1 - eA));

    a.n++; b.n++;
    a.peak = Math.max(a.peak, a.elo);
    b.peak = Math.max(b.peak, b.elo);
    a.lastDate = date; b.lastDate = date;
  }

  return [...r.entries()].map(([fighter_id, v]) => ({
    fighter_id,
    elo: Math.round(v.elo * 10) / 10,
    peak_elo: Math.round(v.peak * 10) / 10,
    n_fights: v.n,
    wins: v.w,
    losses: v.l,
    draws: v.d,
    no_contests: v.nc,
    overall_0_100: toOverall(v.elo),
    last_fight_date: v.lastDate,
  }));
}

async function main() {
  console.log("Loading events + fights...");
  const events = await fetchAll<EloEvent>("events", "id,event_date");
  const fights = await fetchAll<EloFight>(
    "fights",
    "id,event_id,fighter_a_id,fighter_b_id,winner_id,outcome,method"
  );
  const rows = computeRatings(fights, events);

  console.log(`Writing ${rows.length} fighter_ratings...`);
  await upsertBatched("fighter_ratings", rows, "fighter_id");

  const top = [...rows].sort((x, y) => y.elo - x.elo).slice(0, 10);
  const names = await fetchAll<{ id: string; name: string }>("fighters", "id,name");
  const nameById = new Map(names.map((n) => [n.id, n.name]));
  console.log("\nTop 10 by Elo:");
  for (const t of top) {
    console.log(`  ${(nameById.get(t.fighter_id) ?? "?").padEnd(24)} elo=${t.elo}  ovr=${t.overall_0_100}`);
  }
  console.log("Done.");
}

// Run as a script only when invoked directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
