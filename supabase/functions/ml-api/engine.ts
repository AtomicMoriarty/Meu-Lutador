// Pure MMA fight-simulation engine (plan §7). No I/O, no deps, deterministic
// given a seed — so it runs identically in Node (tests) and Deno (edge API).
//
// Input: two fighters, each with the combat attributes (0-100). Every attribute
// also carries the *source* base-fighter name it was inherited from, so the
// event log can later say "the takedown came from X's wrestling".
//
// Output: a structured event log + the result (no prose; narrative is generated
// separately from this log).

export type AttrKey =
  | "power"            // poder_de_mao
  | "volume"           // volume_velocidade
  | "kicks"            // chute_perna
  | "cardio"           // cardio
  | "chin"             // queixo
  | "recovery"         // recuperacao
  | "takedownOffense"  // wrestling_quedas
  | "takedownDefense"  // defesa_queda
  | "groundControl"    // controle_chao
  | "submission"       // finalizacao
  | "fightIq";         // qi_luta

export const ATTR_KEYS: AttrKey[] = [
  "power", "volume", "kicks", "cardio", "chin", "recovery",
  "takedownOffense", "takedownDefense", "groundControl", "submission", "fightIq",
];

// Maps the DB attribute_name -> engine key.
export const ATTR_NAME_TO_KEY: Record<string, AttrKey> = {
  poder_de_mao: "power",
  volume_velocidade: "volume",
  chute_perna: "kicks",
  cardio: "cardio",
  queixo: "chin",
  recuperacao: "recovery",
  wrestling_quedas: "takedownOffense",
  defesa_queda: "takedownDefense",
  controle_chao: "groundControl",
  finalizacao: "submission",
  qi_luta: "fightIq",
};

export type SourcedAttr = { value: number; source?: string };
export type FighterInput = {
  name: string;
  attrs: Record<AttrKey, SourcedAttr>;
};

export type SimEventType =
  | "round_start" | "strike" | "knockdown" | "takedown" | "takedown_stuffed"
  | "control" | "submission_attempt" | "sweep" | "ko" | "tko" | "submission"
  | "round_end" | "decision";

export type SimEvent = {
  round: number;
  clock: string;        // mm:ss elapsed in the round
  type: SimEventType;
  actor?: string;       // fighter name acting
  target?: string;      // fighter name on receiving end
  attribute?: AttrKey;  // attribute that drove this event
  source?: string;      // base fighter the attribute was inherited from
  detail?: string;
};

export type Method = "KO/TKO" | "Submission" | "Decision" | "Draw";

export type SimResult = {
  winner: string | null;       // null => draw
  loser: string | null;
  method: Method;
  round: number;
  clock: string;               // mm:ss when it ended
  rounds: number;
  scorecards: { a: number; b: number };
  events: SimEvent[];
  seed: number;
};

export type SimOptions = { rounds?: 3 | 5; seed?: number };

// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const fmtClock = (elapsed: number) => {
  const s = Math.max(0, Math.min(300, Math.round(elapsed)));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const ROUND_SECONDS = 300;

type State = {
  name: string;
  a: Record<AttrKey, SourcedAttr>;
  health: number;     // 0-100, KO at <= 0
  stamina: number;    // 0-100, scales output
  score: number;      // accumulated round-scoring value
};

const v = (s: State, k: AttrKey) => s.a[k].value;
const src = (s: State, k: AttrKey) => s.a[k].source;

function mk(f: FighterInput): State {
  return { name: f.name, a: f.attrs, health: 100, stamina: 100, score: 0 };
}

/** Run a full fight. */
export function simulate(
  fa: FighterInput,
  fb: FighterInput,
  opts: SimOptions = {}
): SimResult {
  const rounds = opts.rounds ?? 3;
  const seed = opts.seed ?? ((Math.random() * 2 ** 32) >>> 0);
  const rnd = mulberry32(seed);

  const A = mk(fa);
  const B = mk(fb);
  const events: SimEvent[] = [];

  let finish: { winner: State; loser: State; method: Method; round: number; clock: number } | null = null;

  for (let round = 1; round <= rounds && !finish; round++) {
    // ground position for this round: null = standing, else top fighter
    let top: State | null = null;
    let elapsed = 0;
    events.push({ round, clock: "0:00", type: "round_start" });

    // exchanges scale with the pair's volume and current stamina
    const pace = (v(A, "volume") + v(B, "volume")) / 2;
    const nEx = clamp(Math.round(6 + pace / 12), 6, 16);
    const dt = ROUND_SECONDS / nEx;

    for (let i = 0; i < nEx && !finish; i++) {
      elapsed += dt;
      const att = i % 2 === 0 ? A : B; // alternate initiative
      const def = att === A ? B : A;

      if (top) {
        // ----- ground -----
        const bottom: State = top === A ? B : A;
        // top control damage + stamina tax
        const ctrlDmg = (2 + v(top, "groundControl") * 0.04) * (top.stamina / 100);
        bottom.health -= ctrlDmg;
        top.score += 2;
        bottom.stamina -= 1.5;
        events.push({
          round, clock: fmtClock(elapsed), type: "control",
          actor: top.name, target: bottom.name,
          attribute: "groundControl", source: src(top, "groundControl"),
          detail: `controle por cima (-${ctrlDmg.toFixed(0)})`,
        });

        // submission attempt
        const subP = clamp((v(top, "submission") - v(bottom, "submission") * 0.6) / 220 + 0.03, 0.01, 0.22);
        if (rnd() < subP) {
          events.push({
            round, clock: fmtClock(elapsed), type: "submission_attempt",
            actor: top.name, target: bottom.name,
            attribute: "submission", source: src(top, "submission"),
          });
          const finishP = clamp((v(top, "submission") - v(bottom, "fightIq") * 0.4) / 200, 0.05, 0.6) * (1 - bottom.stamina / 300);
          if (rnd() < finishP) {
            finish = { winner: top, loser: bottom, method: "Submission", round, clock: elapsed };
            events.push({
              round, clock: fmtClock(elapsed), type: "submission",
              actor: top.name, target: bottom.name,
              attribute: "submission", source: src(top, "submission"),
              detail: "finalização!",
            });
            break;
          }
        }
        // bottom escape / sweep
        const escP = clamp((v(bottom, "takedownDefense") + v(bottom, "groundControl") - v(top, "groundControl")) / 300 + 0.08, 0.03, 0.5);
        if (rnd() < escP) {
          const swept = rnd() < clamp(v(bottom, "groundControl") / 250, 0.05, 0.4);
          if (swept) {
            top = bottom;
            events.push({
              round, clock: fmtClock(elapsed), type: "sweep",
              actor: bottom.name, target: att === bottom ? def.name : att.name,
              attribute: "groundControl", source: src(bottom, "groundControl"),
              detail: "raspagem, inverteu a posição",
            });
          } else {
            top = null;
            events.push({
              round, clock: fmtClock(elapsed), type: "control",
              actor: bottom.name, attribute: "takedownDefense", source: src(bottom, "takedownDefense"),
              detail: "levantou, luta volta para a trocação",
            });
          }
        }
      } else {
        // ----- standing -----
        // takedown propensity for wrestlers
        const tdProp = clamp(v(att, "takedownOffense") / 100 * 0.3, 0, 0.35);
        if (rnd() < tdProp) {
          const tdP = sigmoid((v(att, "takedownOffense") - v(def, "takedownDefense")) / 18);
          if (rnd() < tdP) {
            top = att;
            att.score += 3;
            events.push({
              round, clock: fmtClock(elapsed), type: "takedown",
              actor: att.name, target: def.name,
              attribute: "takedownOffense", source: src(att, "takedownOffense"),
              detail: "queda completada",
            });
          } else {
            events.push({
              round, clock: fmtClock(elapsed), type: "takedown_stuffed",
              actor: def.name, target: att.name,
              attribute: "takedownDefense", source: src(def, "takedownDefense"),
              detail: "defendeu a queda",
            });
          }
          continue;
        }

        // striking exchange
        const landP = clamp(0.35 + (v(att, "volume") - v(def, "fightIq") * 0.3) / 200, 0.15, 0.85) * (0.6 + att.stamina / 250);
        if (rnd() < landP) {
          const isKick = rnd() < clamp(v(att, "kicks") / 220, 0.05, 0.5);
          const chinMit = 1 - v(def, "chin") / 400;
          const dmg = (5 + v(att, "power") * 0.13 + (isKick ? v(att, "kicks") * 0.03 : 0)) * (att.stamina / 100) * chinMit;
          def.health -= dmg;
          att.score += isKick ? 2 : 1;
          events.push({
            round, clock: fmtClock(elapsed), type: "strike",
            actor: att.name, target: def.name,
            attribute: isKick ? "kicks" : "power",
            source: isKick ? src(att, "kicks") : src(att, "power"),
            detail: `${isKick ? "chute" : "golpe"} conectado (-${dmg.toFixed(0)})`,
          });

          // knockdown chance on clean power shots
          const kdP = clamp((v(att, "power") - v(def, "chin")) / 320 + 0.02, 0.004, 0.22) * (att.stamina / 100);
          if (rnd() < kdP) {
            def.health -= 12;
            events.push({
              round, clock: fmtClock(elapsed), type: "knockdown",
              actor: att.name, target: def.name,
              attribute: "power", source: src(att, "power"),
              detail: "queda por golpe!",
            });
            // survival depends on chin + recovery + remaining health
            const survive = sigmoid((v(def, "chin") + v(def, "recovery") + def.health - 120) / 35);
            if (def.health <= 0 || rnd() > survive) {
              finish = { winner: att, loser: def, method: "KO/TKO", round, clock: elapsed };
              events.push({
                round, clock: fmtClock(elapsed), type: def.health <= 0 ? "ko" : "tko",
                actor: att.name, target: def.name,
                attribute: "power", source: src(att, "power"),
                detail: "nocaute!",
              });
              break;
            } else {
              events.push({
                round, clock: fmtClock(elapsed), type: "control",
                actor: def.name, attribute: "recovery", source: src(def, "recovery"),
                detail: "aguentou e se recuperou",
              });
            }
          }
          if (def.health <= 0 && !finish) {
            finish = { winner: att, loser: def, method: "KO/TKO", round, clock: elapsed };
            events.push({
              round, clock: fmtClock(elapsed), type: "tko",
              actor: att.name, target: def.name,
              attribute: "power", source: src(att, "power"),
              detail: "interrompido por golpes!",
            });
            break;
          }
        }
      }
    }

    if (finish) break;

    // end-of-round: stamina drain (cardio mitigates) + partial recovery
    for (const s of [A, B]) {
      const drain = 10 + (100 - v(s, "cardio")) * 0.12;
      s.stamina = clamp(s.stamina - drain + v(s, "recovery") * 0.05, 5, 100);
      s.health = clamp(s.health + v(s, "recovery") * 0.06, 0, 100);
    }
    events.push({ round, clock: "5:00", type: "round_end" });
  }

  // ----- resolve result -----
  if (finish) {
    return {
      winner: finish.winner.name,
      loser: finish.loser.name,
      method: finish.method,
      round: finish.round,
      clock: fmtClock(finish.clock),
      rounds,
      scorecards: { a: Math.round(A.score), b: Math.round(B.score) },
      events,
      seed,
    };
  }

  // decision by accumulated score (+ remaining health, fightIq tiebreak)
  const aTotal = A.score + A.health * 0.3 + v(A, "fightIq") * 0.1;
  const bTotal = B.score + B.health * 0.3 + v(B, "fightIq") * 0.1;
  let winner: string | null, loser: string | null, method: Method;
  if (Math.abs(aTotal - bTotal) < 0.5) {
    winner = null; loser = null; method = "Draw";
  } else if (aTotal > bTotal) {
    winner = A.name; loser = B.name; method = "Decision";
  } else {
    winner = B.name; loser = A.name; method = "Decision";
  }
  events.push({ round: rounds, clock: "5:00", type: "decision", detail: method === "Draw" ? "empate" : `decisão para ${winner}` });

  return {
    winner, loser, method, round: rounds, clock: "5:00", rounds,
    scorecards: { a: Math.round(A.score), b: Math.round(B.score) },
    events, seed,
  };
}

/** Build a FighterInput from a name + {attrKey: {value, source}} map, filling
 *  any missing attribute with a neutral 50 (so partial builds still simulate). */
export function makeFighter(
  name: string,
  attrs: Partial<Record<AttrKey, SourcedAttr>>
): FighterInput {
  const full = {} as Record<AttrKey, SourcedAttr>;
  for (const k of ATTR_KEYS) full[k] = attrs[k] ?? { value: 50 };
  return { name, attrs: full };
}
