// Attribute pipeline (plan §5.4). For each fighter we compute raw metrics, then
// z-score them WITHIN the fighter's primary weight class and map to 0-100.
//
// confidence:
//   'alto'  -> derived from granular round stats (modern stats era)
//   'medio' -> results-only (no granular data) or an admittedly weak proxy
// Mic skills / style tags are NOT computed here (curation only).

import { fetchAll, upsertBatched } from "./lib/db.js";

type Fight = {
  id: string;
  weight_class: string;
  fighter_a_id: string | null;
  fighter_b_id: string | null;
  winner_id: string | null;
  method: string | null;
  round: number | null;
  time_seconds: number | null;
  has_round_stats: boolean;
};

type RoundStat = {
  fight_id: string;
  fighter_id: string;
  round_num: number;
  knockdowns: number | null;
  sig_str_landed: number | null;
  sig_str_att: number | null;
  td_landed: number | null;
  td_att: number | null;
  sub_att: number | null;
  control_time_seconds: number | null;
  sig_leg_landed: number | null;
};

type Rating = { fighter_id: string; elo: number };

const num = (v: number | null | undefined) => (v == null ? 0 : v);
const fightMinutes = (f: Fight) =>
  ((f.round ?? 1) - 1) * 5 + num(f.time_seconds) / 60;

// Per-fighter accumulators.
type Acc = {
  weightCounts: Map<string, number>;
  totalFights: number;
  wins: number;
  losses: number;
  koWins: number;
  koLosses: number;
  subWins: number;
  winMethods: Set<string>;
  winsVsHigherElo: number;
  decisiveWins: number;
  // granular:
  gMinutes: number;
  sigLanded: number;
  legLanded: number;
  tdLanded: number;
  tdAtt: number;
  subAtt: number;
  controlSec: number;
  earlySig: number;
  earlyRounds: number;
  lateSig: number;
  lateRounds: number;
  oppTdLanded: number;
  oppTdAtt: number;
  timesKnockedDown: number;
};

function newAcc(): Acc {
  return {
    weightCounts: new Map(),
    totalFights: 0, wins: 0, losses: 0, koWins: 0, koLosses: 0, subWins: 0,
    winMethods: new Set(), winsVsHigherElo: 0, decisiveWins: 0,
    gMinutes: 0, sigLanded: 0, legLanded: 0, tdLanded: 0, tdAtt: 0, subAtt: 0,
    controlSec: 0, earlySig: 0, earlyRounds: 0, lateSig: 0, lateRounds: 0,
    oppTdLanded: 0, oppTdAtt: 0, timesKnockedDown: 0,
  };
}

const isKo = (m: string | null) => !!m && /ko\/tko/i.test(m);
const isSub = (m: string | null) => !!m && /submission/i.test(m);

function methodCategory(m: string | null): string {
  if (isKo(m)) return "ko";
  if (isSub(m)) return "sub";
  return "dec";
}

async function main() {
  console.log("Loading fights, round stats, ratings...");
  const fights = await fetchAll<Fight>(
    "fights",
    "id,weight_class,fighter_a_id,fighter_b_id,winner_id,method,round,time_seconds,has_round_stats"
  );
  const stats = await fetchAll<RoundStat>(
    "fight_round_stats",
    "fight_id,fighter_id,round_num,knockdowns,sig_str_landed,sig_str_att,td_landed,td_att,sub_att,control_time_seconds,sig_leg_landed"
  );
  const ratings = await fetchAll<Rating>("fighter_ratings", "fighter_id,elo");
  const eloOf = new Map(ratings.map((r) => [r.fighter_id, r.elo]));
  console.log(`  ${fights.length} fights, ${stats.length} round rows`);

  const fightById = new Map(fights.map((f) => [f.id, f]));
  // round stats grouped by fight -> fighter -> rows
  const byFight = new Map<string, Map<string, RoundStat[]>>();
  for (const s of stats) {
    let m = byFight.get(s.fight_id);
    if (!m) { m = new Map(); byFight.set(s.fight_id, m); }
    let arr = m.get(s.fighter_id);
    if (!arr) { arr = []; m.set(s.fighter_id, arr); }
    arr.push(s);
  }

  const acc = new Map<string, Acc>();
  const get = (id: string) => {
    let a = acc.get(id);
    if (!a) { a = newAcc(); acc.set(id, a); }
    return a;
  };

  // ---- results-based pass (all eras) ----
  for (const f of fights) {
    const ids = [f.fighter_a_id, f.fighter_b_id].filter(Boolean) as string[];
    for (const id of ids) {
      const a = get(id);
      a.totalFights++;
      if (f.weight_class) a.weightCounts.set(f.weight_class, (a.weightCounts.get(f.weight_class) ?? 0) + 1);
      const won = f.winner_id === id;
      const lost = f.winner_id && f.winner_id !== id;
      if (won) {
        a.wins++;
        if (isKo(f.method)) a.koWins++;
        if (isSub(f.method)) a.subWins++;
        a.winMethods.add(methodCategory(f.method));
        a.decisiveWins++;
        const oppId = f.fighter_a_id === id ? f.fighter_b_id : f.fighter_a_id;
        if (oppId && (eloOf.get(oppId) ?? 1500) > (eloOf.get(id) ?? 1500)) a.winsVsHigherElo++;
      } else if (lost) {
        a.losses++;
        if (isKo(f.method)) a.koLosses++;
      }
    }
  }

  // ---- granular pass ----
  for (const [fightId, perFighter] of byFight) {
    const f = fightById.get(fightId);
    if (!f) continue;
    const fighterIds = [...perFighter.keys()];
    for (const id of fighterIds) {
      const a = get(id);
      const own = perFighter.get(id)!;
      const oppId = fighterIds.find((x) => x !== id);
      const opp = oppId ? perFighter.get(oppId)! : [];
      a.gMinutes += fightMinutes(f);
      for (const s of own) {
        a.sigLanded += num(s.sig_str_landed);
        a.legLanded += num(s.sig_leg_landed);
        a.tdLanded += num(s.td_landed);
        a.tdAtt += num(s.td_att);
        a.subAtt += num(s.sub_att);
        a.controlSec += num(s.control_time_seconds);
        if (s.round_num <= 2) { a.earlySig += num(s.sig_str_landed); a.earlyRounds++; }
        else { a.lateSig += num(s.sig_str_landed); a.lateRounds++; }
      }
      for (const s of opp) {
        a.oppTdLanded += num(s.td_landed);
        a.oppTdAtt += num(s.td_att);
        a.timesKnockedDown += num(s.knockdowns);
      }
    }
  }

  // ---- primary weight class per fighter ----
  const primaryWC = new Map<string, string>();
  for (const [id, a] of acc) {
    let best = "unknown", bestN = -1;
    for (const [wc, n] of a.weightCounts) {
      // prefer real divisions over bucket labels when counts tie
      const isReal = !["unknown", "catchweight", "open_weight"].includes(wc);
      const score = n * 10 + (isReal ? 1 : 0);
      if (score > bestN) { bestN = score; best = wc; }
    }
    primaryWC.set(id, best);
  }

  const MIN_GMIN = 15; // need ~1 full fight of granular data
  const hasGranular = (id: string) => num(acc.get(id)?.gMinutes) >= MIN_GMIN;

  // ---- raw metrics (undefined => not emitted for that fighter) ----
  type Metric = { name: string; granular: boolean; values: Map<string, number> };
  const metrics: Metric[] = [];
  const M = (name: string, granular: boolean) => {
    const m: Metric = { name, granular, values: new Map() };
    metrics.push(m);
    return m;
  };

  const mPower = M("poder_de_mao", false);
  const mChin = M("queixo", false);
  const mVolume = M("volume_velocidade", true);
  const mKicks = M("chute_perna", true);
  const mCardio = M("cardio", true);
  const mRecovery = M("recuperacao", true);
  const mTdOff = M("wrestling_quedas", true);
  const mTdDef = M("defesa_queda", true);
  const mGround = M("controle_chao", true);
  const mSub = M("finalizacao", true);
  const mIq = M("qi_luta", false); // proxy, always 'medio'

  for (const [id, a] of acc) {
    if (a.totalFights >= 1) {
      mPower.values.set(id, a.koWins / a.totalFights);
      mChin.values.set(id, 1 - a.koLosses / Math.max(a.losses, 1));
      // fight IQ proxy: wins vs higher-elo opp + method diversity
      const iq = 0.7 * (a.decisiveWins ? a.winsVsHigherElo / a.decisiveWins : 0) +
        0.3 * (a.winMethods.size / 3);
      mIq.values.set(id, iq);
    }
    if (hasGranular(id)) {
      mVolume.values.set(id, a.sigLanded / a.gMinutes); // SLpM
      if (a.sigLanded > 0) mKicks.values.set(id, a.legLanded / a.sigLanded);
      if (a.earlyRounds > 0 && a.lateRounds > 0) {
        const early = a.earlySig / a.earlyRounds;
        const late = a.lateSig / a.lateRounds;
        if (early > 0) mCardio.values.set(id, late / early);
      }
      if (a.timesKnockedDown > 0) {
        mRecovery.values.set(id, 1 - a.koLosses / a.timesKnockedDown);
      }
      mTdOff.values.set(id, (a.tdLanded / a.gMinutes) * 15);
      if (a.oppTdAtt > 0) mTdDef.values.set(id, 1 - a.oppTdLanded / a.oppTdAtt);
      mGround.values.set(id, (a.controlSec / a.gMinutes) * 15);
      mSub.values.set(id, (a.subAtt / a.gMinutes) * 15 + 3 * (a.subWins / Math.max(a.totalFights, 1)));
    }
  }

  // ---- z-score within weight class -> 0-100 ----
  function toScores(m: Metric): { fighter_id: string; value_0_100: number; raw_value: number }[] {
    // group raw values by weight class
    const byWc = new Map<string, { id: string; v: number }[]>();
    for (const [id, v] of m.values) {
      const wc = primaryWC.get(id) ?? "unknown";
      if (!byWc.has(wc)) byWc.set(wc, []);
      byWc.get(wc)!.push({ id, v });
    }
    const out: { fighter_id: string; value_0_100: number; raw_value: number }[] = [];
    for (const [, arr] of byWc) {
      const mean = arr.reduce((s, x) => s + x.v, 0) / arr.length;
      const sd = Math.sqrt(arr.reduce((s, x) => s + (x.v - mean) ** 2, 0) / arr.length) || 0;
      for (const x of arr) {
        const z = sd === 0 ? 0 : (x.v - mean) / sd;
        const score = Math.max(1, Math.min(99, Math.round(50 + 15 * z)));
        out.push({ fighter_id: x.id, value_0_100: score, raw_value: Math.round(x.v * 1000) / 1000 });
      }
    }
    return out;
  }

  const rows: {
    fighter_id: string; weight_class: string; era_window_id: string;
    attribute_name: string; value_0_100: number; raw_value: number; confidence: string;
  }[] = [];

  for (const m of metrics) {
    for (const s of toScores(m)) {
      let confidence: string;
      if (m.name === "qi_luta") confidence = "medio";
      else if (m.granular) confidence = "alto";
      else confidence = hasGranular(s.fighter_id) ? "alto" : "medio";
      rows.push({
        fighter_id: s.fighter_id,
        weight_class: primaryWC.get(s.fighter_id) ?? "unknown",
        era_window_id: "career",
        attribute_name: m.name,
        value_0_100: s.value_0_100,
        raw_value: s.raw_value,
        confidence,
      });
    }
  }

  console.log(`Writing ${rows.length} attribute_scores...`);
  await upsertBatched("attribute_scores", rows, "fighter_id,weight_class,era_window_id,attribute_name");

  const byConf = rows.reduce((acc2, r) => {
    acc2[r.confidence] = (acc2[r.confidence] ?? 0) + 1;
    return acc2;
  }, {} as Record<string, number>);
  console.log("\n=== Attributes summary ===");
  console.log(`fighters with any attribute: ${new Set(rows.map((r) => r.fighter_id)).size}`);
  console.log(`rows by confidence:`, byConf);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
