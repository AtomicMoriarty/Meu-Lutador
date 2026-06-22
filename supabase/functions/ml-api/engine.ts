// Pure MMA fight-simulation engine (career-mode). No I/O, no deps, deterministic
// given a seed — runs identically in Node (tests) and the browser (the app runs
// it client-side). Produces a rich PT-BR event log (reads like a story WITHOUT
// any AI), real 10-point-must judging (3 judges), fouls, and dramatic suspense.

export type AttrKey =
  | "power" | "volume" | "kicks" | "cardio" | "chin" | "recovery"
  | "takedownOffense" | "takedownDefense" | "groundControl" | "submission" | "fightIq" | "carisma";

export const ATTR_KEYS: AttrKey[] = [
  "power", "volume", "kicks", "cardio", "chin", "recovery",
  "takedownOffense", "takedownDefense", "groundControl", "submission", "fightIq", "carisma",
];

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
  carisma: "carisma",
};

export type SourcedAttr = { value: number; source?: string };
export type FighterInput = { name: string; attrs: Record<AttrKey, SourcedAttr> };

export type SimEventType =
  | "round_start" | "round_end" | "strike" | "big_strike" | "kick" | "miss" | "luck"
  | "knockdown" | "hurt" | "swarm" | "recover" | "saved_by_bell"
  | "takedown" | "takedown_stuffed" | "control" | "ground_strikes" | "sweep" | "scramble"
  | "submission_attempt" | "submission" | "ko" | "tko" | "foul" | "decision";

export type SimEvent = {
  round: number;
  clock: string;
  type: SimEventType;
  actor?: string;
  target?: string;
  attribute?: AttrKey;
  source?: string;
  detail?: string;
};

export type Method = "KO/TKO" | "Submission" | "Decision" | "Draw";
export type JudgeCard = { a: number; b: number };

export type SimResult = {
  winner: string | null;
  loser: string | null;
  method: Method;
  decision: string;          // PT label, e.g. "Decisão Unânime"
  round: number;
  clock: string;
  rounds: number;
  judges: JudgeCard[];       // 3 judges
  roundScores: { round: number; a: number; b: number }[];
  events: SimEvent[];
  seed: number;
};

export type SimOptions = { rounds?: 3 | 5; seed?: number };

// --------------------------------------------------------------------------- RNG
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
const fmtClock = (s: number) => {
  const v = Math.max(0, Math.min(300, Math.round(s)));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};
const ROUND_SECONDS = 300;

// --------------------------------------------------------------------------- phrases (PT-BR)
const PUNCH = ["um jab firme", "um direto de direita", "um cruzado pesado", "um gancho curto", "um uppercut", "um overhand", "uma sequência de socos"];
const KICK_LOW = ["um chute baixo que ecoa pela arena", "um low kick castigando a coxa"];
const KICK_BODY = ["um chute no corpo", "um chute nas costelas que tira o ar"];
const KICK_HEAD = ["um chute alto", "uma canela no queixo"];
const MISS = ["mas a defesa estava pronta", "mas o oponente esquivou", "mas escorregou o golpe", "mas travou na guarda"];
const TAKEDOWN = ["completou uma queda dupla", "derrubou com uma queda simples", "conseguiu um slam violento", "levou a luta para o chão"];
const TD_STUFF = ["mas a queda foi defendida", "mas sprawlou e escapou", "mas não conseguiu derrubar"];
const CONTROL = ["mantém o controle por cima", "trabalha o ground and pound", "pressiona na guarda", "avança para a montada"];
const GNP = ["martela com cotoveladas no chão", "despeja golpes de cima", "castiga com ground and pound"];
const SWEEP = ["raspou e inverteu a posição", "conseguiu uma raspagem linda", "girou por cima"];
const GETUP = ["levantou e voltou para a trocação", "conseguiu se recompor de pé"];
const SUBS = ["uma mata-leão", "uma guilhotina", "um triângulo", "uma chave de braço", "uma kimura", "uma americana", "um katagatame"];
const HURT = ["está machucado!", "balançou! as pernas bambearam", "sentiu o golpe e recuou cambaleando", "tropeçou para trás, em apuros"];
const SWARM = ["parte pra cima buscando o nocaute", "vai com tudo tentando acabar a luta", "despeja golpes procurando o fim"];
const RECOVER = ["mas aguentou e se recuperou", "mas clinçou e sobreviveu ao perigo", "mas limpou a cabeça e seguiu"];
const SAVED = ["e o gongo salva no fim do round!", "salvo pelo gongo!"];
const KO = ["NOCAUTE! apagou as luzes!", "caiu desacordado, acabou!", "um golpe perfeito, KO seco!"];
const TKO = ["o árbitro intervém — TKO!", "não revida mais e o árbitro para a luta!", "castigo demais, TKO!"];
const FOUL = ["golpe baixo! tempo para se recuperar", "dedo no olho acidental, ação interrompida", "segurou a grade e perde um ponto", "joelhada ilegal, advertência e ponto"];
const LUCK_GOOD = ["entrou ligado neste round", "parece em noite inspirada", "achou o ritmo cedo", "a sorte sorri para ele agora"];
const LUCK_BAD = ["começou morno neste round", "parece um passo atrás", "custou a engrenar", "a noite não está fácil para ele"];
const pick = <T,>(rng: () => number, a: T[]): T => a[Math.floor(rng() * a.length)]!;

// --------------------------------------------------------------------------- state
type Tally = { dmg: number; sig: number; kd: number; ctrl: number; sub: number; td: number; foul: number };
const newTally = (): Tally => ({ dmg: 0, sig: 0, kd: 0, ctrl: 0, sub: 0, td: 0, foul: 0 });

type State = {
  name: string;
  a: Record<AttrKey, SourcedAttr>;
  health: number;
  stamina: number;
  t: Tally; // current-round tally
};
const v = (s: State, k: AttrKey) => s.a[k].value;
const src = (s: State, k: AttrKey) => s.a[k].source;
const mk = (f: FighterInput): State => ({ name: f.name, a: f.attrs, health: 100, stamina: 100, t: newTally() });

// --------------------------------------------------------------------------- judging (10-point must)
function marginFromDiff(absd: number, kd: number): number {
  if (kd >= 2 || absd >= 42) return 3;      // 10-7
  if (kd >= 1 || absd >= 20) return 2;      // 10-8
  if (absd < 2) return 0;                    // 10-10
  return 1;                                  // 10-9
}
function scoreOneJudge(domDiff: number, kd: number, foulA: number, foulB: number) {
  const aWins = domDiff >= 0;
  const margin = marginFromDiff(Math.abs(domDiff), kd);
  let a = 10, b = 10;
  if (margin > 0) { if (aWins) b = 10 - margin; else a = 10 - margin; }
  return { a: a - foulA, b: b - foulB };
}

export function simulate(fa: FighterInput, fb: FighterInput, opts: SimOptions = {}): SimResult {
  const rounds = opts.rounds ?? 3;
  const seed = opts.seed ?? ((Math.random() * 2 ** 32) >>> 0);
  const rng = mulberry32(seed);
  const A = mk(fa), B = mk(fb);
  const events: SimEvent[] = [];
  const judges: JudgeCard[] = [{ a: 0, b: 0 }, { a: 0, b: 0 }, { a: 0, b: 0 }];
  const roundScores: { round: number; a: number; b: number }[] = [];

  let finish: { winner: State; loser: State; method: Method; round: number; clock: number } | null = null;

  const ev = (round: number, elapsed: number, type: SimEventType, actor?: State, opt?: Partial<SimEvent>) =>
    events.push({ round, clock: fmtClock(elapsed), type, actor: actor?.name, ...opt });

  for (let round = 1; round <= rounds && !finish; round++) {
    A.t = newTally(); B.t = newTally();
    let top: State | null = null;
    let elapsed = 0;
    let hurtState: State | null = null; // who is hurt right now
    events.push({ round, clock: "0:00", type: "round_start", detail: `Round ${round}` });

    // luck/misfortune roulette — biased by CARISMA (never decisive): high carisma
    // shifts the mean up but can still draw bad luck; low carisma the opposite.
    const luckA = 1 + ((v(A, "carisma") - 50) / 50) * 0.04 + (rng() * 2 - 1) * 0.06;
    const luckB = 1 + ((v(B, "carisma") - 50) / 50) * 0.04 + (rng() * 2 - 1) * 0.06;
    const luckOf = (s: State) => (s === A ? luckA : luckB);
    const swing = Math.abs(luckA - 1) >= Math.abs(luckB - 1) ? { s: A, l: luckA } : { s: B, l: luckB };
    if (Math.abs(swing.l - 1) > 0.035) {
      ev(round, 2, "luck", swing.s, { detail: pick(rng, swing.l > 1 ? LUCK_GOOD : LUCK_BAD) });
    }

    const pace = (v(A, "volume") + v(B, "volume")) / 2;
    const nEx = clamp(Math.round(7 + pace / 11), 7, 16);
    const dt = ROUND_SECONDS / nEx;

    for (let i = 0; i < nEx && !finish; i++) {
      elapsed += dt;
      const att = i % 2 === 0 ? A : B;
      const def = att === A ? B : A;

      // rare foul — the acting fighter commits it and loses a point this round
      if (rng() < 0.02) {
        att.t.foul += 1;
        def.health = clamp(def.health + 4, 0, 100); // brief recovery time
        ev(round, elapsed, "foul", att, { target: def.name, detail: pick(rng, FOUL) });
        continue;
      }

      if (top) {
        const bottom: State = top === A ? B : A;
        const ctrlDmg = (2 + v(top, "groundControl") * 0.04) * (top.stamina / 100) * luckOf(top);
        bottom.health -= ctrlDmg;
        top.t.dmg += ctrlDmg; top.t.ctrl += dt;
        bottom.stamina -= 1.5;
        ev(round, elapsed, rng() < 0.5 ? "ground_strikes" : "control", top, {
          target: bottom.name, attribute: "groundControl", source: src(top, "groundControl"),
          detail: pick(rng, rng() < 0.5 ? GNP : CONTROL),
        });

        const subP = clamp((v(top, "submission") - v(bottom, "submission") * 0.6) / 220 + 0.03, 0.01, 0.22);
        if (rng() < subP) {
          const name = pick(rng, SUBS);
          top.t.sub += 1;
          ev(round, elapsed, "submission_attempt", top, { target: bottom.name, attribute: "submission", source: src(top, "submission"), detail: `ameaça com ${name}` });
          const finishP = clamp((v(top, "submission") - v(bottom, "fightIq") * 0.4) / 200, 0.05, 0.6) * (1 - bottom.stamina / 300);
          if (rng() < finishP) {
            finish = { winner: top, loser: bottom, method: "Submission", round, clock: elapsed };
            ev(round, elapsed, "submission", top, { target: bottom.name, attribute: "submission", source: src(top, "submission"), detail: `finalizou com ${name}!` });
            break;
          }
        }
        const escP = clamp((v(bottom, "takedownDefense") + v(bottom, "groundControl") - v(top, "groundControl")) / 300 + 0.08, 0.03, 0.5);
        if (rng() < escP) {
          if (rng() < clamp(v(bottom, "groundControl") / 250, 0.05, 0.4)) {
            top = bottom;
            ev(round, elapsed, "sweep", bottom, { attribute: "groundControl", source: src(bottom, "groundControl"), detail: pick(rng, SWEEP) });
          } else {
            top = null;
            ev(round, elapsed, "scramble", bottom, { attribute: "takedownDefense", source: src(bottom, "takedownDefense"), detail: pick(rng, GETUP) });
          }
        }
      } else {
        // takedown attempt for wrestlers
        const tdProp = clamp(v(att, "takedownOffense") / 100 * 0.3, 0, 0.35);
        if (rng() < tdProp) {
          if (rng() < sigmoid((v(att, "takedownOffense") - v(def, "takedownDefense")) / 18)) {
            top = att; att.t.td += 1;
            ev(round, elapsed, "takedown", att, { target: def.name, attribute: "takedownOffense", source: src(att, "takedownOffense"), detail: pick(rng, TAKEDOWN) });
          } else {
            ev(round, elapsed, "takedown_stuffed", def, { target: att.name, attribute: "takedownDefense", source: src(def, "takedownDefense"), detail: pick(rng, TD_STUFF) });
          }
          continue;
        }

        // striking — carisma gives a light intimidation edge (±5%)
        const morale = 1 + clamp((v(att, "carisma") - v(def, "carisma")) / 2000, -0.05, 0.05);
        const landP = clamp(0.4 + (v(att, "volume") - v(def, "fightIq") * 0.3) / 200, 0.18, 0.85) * (0.6 + att.stamina / 250) * morale * luckOf(att);
        if (rng() >= landP) {
          if (rng() < 0.4) ev(round, elapsed, "miss", att, { target: def.name, detail: pick(rng, MISS) });
          continue;
        }
        const isKick = rng() < clamp(v(att, "kicks") / 220, 0.05, 0.5);
        const chinMit = 1 - v(def, "chin") / 400;
        let phrase: string, headKick = false;
        if (isKick) {
          const r = rng();
          if (r < 0.5) phrase = pick(rng, KICK_LOW);
          else if (r < 0.82) phrase = pick(rng, KICK_BODY);
          else { phrase = pick(rng, KICK_HEAD); headKick = true; }
        } else phrase = pick(rng, PUNCH);
        const dmg = (5 + v(att, "power") * 0.13 + (isKick ? v(att, "kicks") * 0.03 : 0) + (headKick ? 6 : 0)) * (att.stamina / 100) * chinMit;
        def.health -= dmg;
        att.t.dmg += dmg; att.t.sig += 1;
        const big = dmg >= 12 || headKick;
        ev(round, elapsed, isKick ? "kick" : big ? "big_strike" : "strike", att, {
          target: def.name, attribute: isKick ? "kicks" : "power",
          source: isKick ? src(att, "kicks") : src(att, "power"),
          detail: `acertou ${phrase} (-${dmg.toFixed(0)})`,
        });

        // knockdown / hurt
        const kdP = clamp((v(att, "power") - v(def, "chin")) / 320 + 0.02 + (headKick ? 0.08 : 0), 0.004, 0.3) * (att.stamina / 100);
        if (rng() < kdP || def.health < 28) {
          def.health -= 10; att.t.kd += 1;
          ev(round, elapsed, "knockdown", att, { target: def.name, attribute: "power", source: src(att, "power"), detail: "QUEDA! mandou ao chão!" });
          hurtState = def;
          ev(round, elapsed, "hurt", def, { detail: pick(rng, HURT) });
          ev(round, elapsed, "swarm", att, { target: def.name, detail: pick(rng, SWARM) });
          const survive = sigmoid((v(def, "chin") + v(def, "recovery") + def.health - 115) / 30);
          if (def.health <= 0 || rng() > survive) {
            finish = { winner: att, loser: def, method: "KO/TKO", round, clock: elapsed };
            ev(round, elapsed, def.health <= 0 ? "ko" : "tko", att, { target: def.name, attribute: "power", source: src(att, "power"), detail: pick(rng, def.health <= 0 ? KO : TKO) });
            break;
          } else {
            ev(round, elapsed, "recover", def, { attribute: "recovery", source: src(def, "recovery"), detail: pick(rng, RECOVER) });
            hurtState = null;
          }
        }
      }
    }
    if (finish) break;

    // saved by the bell flavor
    if (hurtState) ev(round, ROUND_SECONDS, "saved_by_bell", hurtState, { detail: pick(rng, SAVED) });

    // ---- score the round (true) + 3 judges ----
    const dom = (s: State) => s.t.dmg + s.t.kd * 30 + s.t.sig * 0.4 + s.t.ctrl * 0.04 + s.t.sub * 5 + s.t.td * 4;
    const diff = dom(A) - dom(B);
    const kd = A.t.kd + B.t.kd;
    const trueScore = scoreOneJudge(diff, kd, A.t.foul, B.t.foul);
    roundScores.push({ round, a: trueScore.a, b: trueScore.b });
    const winnerName = trueScore.a === trueScore.b ? "empate" : trueScore.a > trueScore.b ? A.name : B.name;
    events.push({ round, clock: "5:00", type: "round_end", detail: `Fim do round ${round} — ${Math.max(trueScore.a, trueScore.b)}-${Math.min(trueScore.a, trueScore.b)} ${winnerName}` });
    for (let j = 0; j < 3; j++) {
      const noise = (rng() * 2 - 1) * 7;
      const jc = scoreOneJudge(diff + noise, kd, A.t.foul, B.t.foul);
      judges[j]!.a += jc.a; judges[j]!.b += jc.b;
    }

    // end-of-round recovery / stamina
    for (const s of [A, B]) {
      s.stamina = clamp(s.stamina - (10 + (100 - v(s, "cardio")) * 0.12) + v(s, "recovery") * 0.05, 5, 100);
      s.health = clamp(s.health + 8 + v(s, "recovery") * 0.07, 0, 100);
    }
  }

  // ---------- resolve ----------
  if (finish) {
    return {
      winner: finish.winner.name, loser: finish.loser.name, method: finish.method,
      decision: finish.method === "Submission" ? "Finalização" : "Nocaute",
      round: finish.round, clock: fmtClock(finish.clock), rounds,
      judges, roundScores, events, seed,
    };
  }

  // decision by 3 judges
  let cA = 0, cB = 0, cD = 0;
  for (const j of judges) { if (j.a > j.b) cA++; else if (j.b > j.a) cB++; else cD++; }
  let winner: string | null, loser: string | null, method: Method, decision: string;
  if (cA >= 2 || cB >= 2) {
    const aWins = cA > cB;
    winner = aWins ? A.name : B.name; loser = aWins ? B.name : A.name; method = "Decision";
    const w = aWins ? cA : cB;
    decision = w === 3 ? "Decisão Unânime" : cD >= 1 ? "Decisão Majoritária" : "Decisão Dividida";
  } else {
    winner = null; loser = null; method = "Draw";
    decision = cD >= 2 ? "Empate Majoritário" : "Empate Dividido";
  }
  events.push({ round: rounds, clock: "5:00", type: "decision", detail: method === "Draw" ? "Vai para os cartões... EMPATE!" : `Vai para os cartões... ${decision}: ${winner}!` });

  return { winner, loser, method, decision, round: rounds, clock: "5:00", rounds, judges, roundScores, events, seed };
}

/** Build a FighterInput from a name + partial attrs, filling gaps with 50. */
export function makeFighter(name: string, attrs: Partial<Record<AttrKey, SourcedAttr>>): FighterInput {
  const full = {} as Record<AttrKey, SourcedAttr>;
  for (const k of ATTR_KEYS) full[k] = attrs[k] ?? { value: 50 };
  return { name, attrs: full };
}
