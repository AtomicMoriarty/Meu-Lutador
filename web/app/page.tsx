"use client";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useState } from "react";
import { randomFullFighters } from "@/lib/api";
import { ATTRIBUTE_SLOTS, type Build, type FullFighter } from "@/lib/types";
import {
  makeFighter,
  simulate,
  ATTR_NAME_TO_KEY,
  type AttrKey,
  type FighterInput,
  type SimResult,
} from "@/lib/engine";
import { Spinner, StatBar, cx } from "@/components/ui";
import { Dice } from "@/components/ui/dice";
import { FighterAssignSheet } from "@/components/FighterAssignSheet";
import { FightPlayback, type Speed } from "@/components/FightPlayback";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HoverButton } from "@/components/ui/hover-button";
import { MagneticCta } from "@/components/ui/magnetic-cta";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Toast } from "@/components/ui/toast";
import { Landing } from "@/components/Landing";
import {
  ArrowDownUp, Dices, Flame, Gauge, Orbit, RefreshCw,
  ShieldCheck, Skull, Swords, Target, Trophy, Wind,
  type LucideIcon,
} from "lucide-react";
import { SlotIcon } from "@/components/ui/slot-icon";

type Stage = "intro" | "create" | "build" | "ready" | "loading" | "fight" | "gameover" | "champion";
const TOTAL = 8;
const num = (x: unknown) => Number(x) || 0;

const STANCES: Record<string, { label: string; icon: LucideIcon; buff: string[]; nerf: string[] }> = {
  defensivo: { label: "Defensivo", icon: ShieldCheck, buff: ["queixo", "defesa_queda", "recuperacao"], nerf: ["poder_de_mao", "volume_velocidade"] },
  equilibrado: { label: "Equilibrado", icon: Gauge, buff: [], nerf: [] },
  agressivo: { label: "Agressivo", icon: Flame, buff: ["poder_de_mao", "volume_velocidade"], nerf: ["queixo", "defesa_queda"] },
};
const DISCIPLINES: Record<string, { label: string; icon: LucideIcon; buff: string[]; nerf: string[] }> = {
  jiu_jitsu: { label: "Jiu-Jitsu", icon: Orbit, buff: ["finalizacao", "controle_chao"], nerf: ["poder_de_mao"] },
  boxe: { label: "Boxe", icon: Target, buff: ["poder_de_mao", "volume_velocidade"], nerf: ["controle_chao"] },
  wrestling: { label: "Wrestling", icon: ArrowDownUp, buff: ["wrestling_quedas", "controle_chao"], nerf: ["chute_perna"] },
  muay_thai: { label: "Muay Thai", icon: Swords, buff: ["chute_perna", "poder_de_mao"], nerf: ["wrestling_quedas"] },
  karate: { label: "Karatê", icon: Wind, buff: ["chute_perna", "volume_velocidade"], nerf: ["finalizacao"] },
};
const LABEL_BY_ATTR = Object.fromEntries(ATTRIBUTE_SLOTS.map((s) => [s.attribute_name, s.label]));

function modFactor(attr: string, stance: string, discipline: string): number {
  let f = 1;
  for (const m of [STANCES[stance], DISCIPLINES[discipline]]) {
    if (!m) continue;
    if (m.buff.includes(attr)) f *= 1.1;
    if (m.nerf.includes(attr)) f *= 0.9;
  }
  return f;
}

function toFighter(name: string, entries: { attr: string; value: number; source?: string }[]): FighterInput {
  const attrs: Partial<Record<AttrKey, { value: number; source?: string }>> = {};
  for (const e of entries) {
    const k = ATTR_NAME_TO_KEY[e.attr];
    if (k) attrs[k] = { value: e.value, source: e.source };
  }
  return makeFighter(name, attrs);
}

function buildOpponents(pool: FullFighter[]): FullFighter[] {
  const sorted = [...pool].sort((a, b) => num(b.overall) - num(a.overall));
  return sorted.slice(0, TOTAL).reverse();
}

const STANCE_KEYS = Object.keys(STANCES);
const DISC_KEYS = Object.keys(DISCIPLINES);
const pickKey = (a: string[]) => a[Math.floor(Math.random() * a.length)]!;

function opponentFighter(o: FullFighter, index: number): FighterInput {
  const scale = 1.05 + index * 0.06;
  const floor = 40 + index * 3;
  const oStance = pickKey(STANCE_KEYS);
  const oDisc = pickKey(DISC_KEYS);
  const entries = ATTRIBUTE_SLOTS.map((s) => {
    const base = num(o.attrs?.[s.attribute_name] ?? 50) * scale * modFactor(s.attribute_name, oStance, oDisc);
    return { attr: s.attribute_name, value: Math.max(floor, Math.min(96, Math.round(base))), source: o.name };
  });
  return toFighter(o.name || "Desafiante", entries);
}

const fightLabel = (i: number) => (i === 7 ? "MAIN EVENT" : i === 6 ? "CO-MAIN" : `Luta ${i + 1}`);
const roundsFor = (i: number): 3 | 5 => (i >= 6 ? 5 : 3);

const stageTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

export default function Page() {
  const [stage, setStage] = useState<Stage>("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Meu Lutador");
  const [stance, setStance] = useState<string>("equilibrado");
  const [discipline, setDiscipline] = useState<string>("boxe");
  const [build, setBuild] = useState<Build>({});
  const [batch, setBatch] = useState<FullFighter[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rerolls, setRerolls] = useState(3);
  const [selected, setSelected] = useState<FullFighter | null>(null);
  const [speed, setSpeed] = useState<Speed>("rapida");
  const [auto, setAuto] = useState(false);

  const [player, setPlayer] = useState<FighterInput | null>(null);
  const [opponents, setOpponents] = useState<FullFighter[]>([]);
  const [idx, setIdx] = useState(0);
  const [record, setRecord] = useState({ w: 0, l: 0 });
  const [result, setResult] = useState<SimResult | null>(null);
  const [playerWon, setPlayerWon] = useState(false);
  const [oppName, setOppName] = useState("");

  async function fetchBatch() {
    setRolling(true);
    try {
      const r = await randomFullFighters(10);
      setBatch(r);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setRolling(false);
    }
  }
  function rollMain() {
    if (rolling || batch.length > 0) return;
    void fetchBatch();
  }
  function reroll() {
    if (rolling || batch.length === 0 || rerolls <= 0) return;
    setRerolls((n) => n - 1);
    void fetchBatch();
  }

  function newRun() {
    setBuild({});
    setBatch([]);
    setRerolls(3);
    setRecord({ w: 0, l: 0 });
    setIdx(0);
    setResult(null);
    setStage("build");
    void fetchBatch();
  }

  function startFight(index: number, p: FighterInput, opps: FullFighter[]) {
    const opp = opps[index]!;
    const oppF = opponentFighter(opp, index);
    setOppName(oppF.name);
    const r = simulate(p, oppF, { rounds: roundsFor(index), seed: (Date.now() + index * 7919) >>> 0 });
    setResult(r);
    setPlayerWon(r.winner === p.name);
    setIdx(index);
    setStage("fight");
  }

  async function startCareer() {
    setError(null);
    setBusy(true);
    setStage("loading");
    try {
      const entries = ATTRIBUTE_SLOTS.map((s) => {
        const o = build[s.attribute_name];
        const base = o ? num(o.value) : 50;
        const value = Math.max(12, Math.min(95, Math.round(base * modFactor(s.attribute_name, stance, discipline))));
        return { attr: s.attribute_name, value, source: o?.name };
      });
      const p = toFighter(name || "Meu Lutador", entries);
      setPlayer(p);
      const oppoolRaw = await randomFullFighters(40);
      const opps = buildOpponents(oppoolRaw);
      if (opps.length < TOTAL) throw new Error("não foi possível montar os adversários");
      setOpponents(opps);
      setRecord({ w: 0, l: 0 });
      startFight(0, p, opps);
    } catch (e) {
      setError(String((e as Error).message));
      setStage("build");
    } finally {
      setBusy(false);
    }
  }

  function afterFight() {
    if (!player) return;
    if (playerWon) {
      setRecord((r) => ({ ...r, w: r.w + 1 }));
      if (idx >= TOTAL - 1) setStage("champion");
      else startFight(idx + 1, player, opponents);
    } else {
      setRecord((r) => ({ ...r, l: r.l + 1 }));
      setStage("gameover");
    }
  }

  const filled = ATTRIBUTE_SLOTS.filter((s) => build[s.attribute_name]).length;
  const ctaLabel = playerWon ? (idx >= TOTAL - 1 ? "Ver título" : "Próxima luta →") : "Ver resultado";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700"
        style={{ opacity: stage === "intro" ? 0.7 : 0.25 }}
        aria-hidden
      >
        <BackgroundGradientAnimation interactive={false} />
      </div>

      <Toast message={error} onClose={() => setError(null)} />

      <AnimatePresence mode="wait">
        {stage === "intro" ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20, filter: "blur(6px)" }} transition={stageTransition}>
            <Landing onStart={() => setStage("create")} />
          </motion.div>
        ) : (
          <motion.div key="game" initial={{ opacity: 0, y: 16, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={stageTransition}>
            <main className="relative mx-auto w-full max-w-xl px-4 pb-28 pt-6">
              <header className="mb-8 text-center">
                <p className="eyebrow text-mist/80">Octógono dos Sonhos</p>
                <h1 className="display mt-1.5 text-3xl text-glow">MEU LUTADOR</h1>
              </header>

              <AnimatePresence mode="wait">
                {stage === "create" && (
                  <motion.section key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={stageTransition} className="flex flex-col gap-5">
                    <div>
                      <p className="eyebrow text-blood-2">Passo 1 de 3</p>
                      <h2 className="display mt-1.5 text-2xl">Crie seu personagem</h2>
                    </div>

                    <div className="card p-5">
                      <label htmlFor="fighter-name" className="eyebrow">Nome</label>
                      <input id="fighter-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2.5 w-full rounded-xl border border-line bg-ink-3/80 px-4 py-2.5 font-bold outline-none transition focus:border-blood focus:ring-1 focus:ring-blood/30" />
                    </div>

                    <div className="card p-5">
                      <p className="eyebrow mb-3">Estilo</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {Object.entries(STANCES).map(([k, vv]) => (
                          <button key={k} onClick={() => setStance(k)} className={cx("rounded-xl border p-3.5 text-center transition-all", stance === k ? "border-blood bg-blood/10 shadow-[0_0_20px_-4px_rgba(225,29,42,0.3)]" : "border-line bg-smoke hover:bg-smoke-2")}>
                            <div className="flex justify-center" aria-hidden><vv.icon className="size-6 text-mist-2" strokeWidth={1.8} /></div>
                            <div className="mt-1.5 text-xs font-bold">{vv.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="card p-5">
                      <p className="eyebrow mb-3">Arte principal</p>
                      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                        {Object.entries(DISCIPLINES).map(([k, vv]) => (
                          <button key={k} onClick={() => setDiscipline(k)} className={cx("rounded-xl border p-3.5 text-center transition-all", discipline === k ? "border-gold bg-gold/10 shadow-[0_0_20px_-4px_rgba(245,181,63,0.3)]" : "border-line bg-smoke hover:bg-smoke-2")}>
                            <div className="flex justify-center" aria-hidden><vv.icon className="size-6 text-mist-2" strokeWidth={1.8} /></div>
                            <div className="mt-1.5 text-[11px] font-bold leading-tight">{vv.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="card p-5 text-sm">
                      <p className="eyebrow mb-2.5">Efeito do estilo</p>
                      {(() => {
                        const ups = new Set<string>(), downs = new Set<string>();
                        for (const m of [STANCES[stance], DISCIPLINES[discipline]]) {
                          m?.buff.forEach((a) => ups.add(a));
                          m?.nerf.forEach((a) => downs.add(a));
                        }
                        for (const a of [...ups]) if (downs.has(a)) { ups.delete(a); downs.delete(a); }
                        return (
                          <div className="flex flex-col gap-2">
                            <p className="text-emerald-400">▲ Melhora: {[...ups].map((a) => LABEL_BY_ATTR[a]).join(", ") || "—"}</p>
                            <p className="text-blood-2">▼ Piora: {[...downs].map((a) => LABEL_BY_ATTR[a]).join(", ") || "—"}</p>
                          </div>
                        );
                      })()}
                    </div>

                    <MagneticCta className="w-full" onClick={newRun}>Continuar →</MagneticCta>
                  </motion.section>
                )}

                {stage === "build" && (
                  <motion.section key="build" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={stageTransition} className="flex flex-col gap-5">
                    <div>
                      <p className="eyebrow text-blood-2">Passo 2 de 3</p>
                      <h2 className="display mt-1.5 text-2xl">Monte seu lutador</h2>
                    </div>

                    <div className="card flex items-center justify-between gap-2 p-3.5 text-sm">
                      <span className="truncate font-bold text-white">{name || "Meu Lutador"}</span>
                      <span className="shrink-0 text-xs text-mist">{STANCES[stance]?.label} · {DISCIPLINES[discipline]?.label}</span>
                    </div>

                    {/* Dado + sorteio */}
                    <div className="card flex flex-col items-center gap-4 p-5">
                      <Dice rolling={rolling} disabled={batch.length > 0} onRoll={rollMain} />
                      <p className="text-center text-xs leading-relaxed text-mist">
                        Role o dado, toque num lutador e escolha <strong className="text-white">o atributo</strong> dele.
                        Re-sorteios: <strong className="text-gold">{rerolls}</strong>
                      </p>
                      {batch.length > 0 && (
                        <button
                          onClick={reroll}
                          disabled={rolling || rerolls <= 0}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-smoke px-4 py-1.5 text-xs font-bold text-mist-2 transition hover:bg-smoke-2 hover:text-white disabled:opacity-40"
                        >
                          <RefreshCw className="size-3" aria-hidden />
                          Re-sortear ({rerolls})
                        </button>
                      )}
                      <div className="grid w-full grid-cols-2 gap-2.5">
                        {rolling && batch.length === 0 ? (
                          <>
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="skeleton h-16 rounded-xl" />
                            ))}
                          </>
                        ) : batch.length === 0 ? (
                          <div className="col-span-2 flex flex-col items-center gap-3 py-8">
                            <div className="grid size-16 place-items-center rounded-2xl border border-dashed border-line-2">
                              <Dices className="size-8 text-mist/30" strokeWidth={1.5} />
                            </div>
                            <p className="text-center text-sm text-mist">Role o dado para sortear 10 lutadores</p>
                          </div>
                        ) : (
                          batch.map((f, i) => (
                            <motion.button
                              key={f.fighter_id + i}
                              initial={{ opacity: 0, y: 12, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: Math.min(i * 0.05, 0.45), ease: [0.22, 1, 0.36, 1] }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setSelected(f)}
                              className="flex items-center gap-2.5 rounded-xl border border-line bg-smoke p-3 text-left transition-all hover:border-gold/40 hover:bg-smoke-2 hover:shadow-[0_0_16px_-4px_rgba(245,181,63,0.2)]"
                            >
                              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-3" aria-hidden><Swords className="size-5 text-mist-2" strokeWidth={1.5} /></div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-bold">{f.name}</span>
                                <span className="block truncate text-[10px] text-mist">{f.nickname ? `"${f.nickname}"` : "toque para encaixar"}</span>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Slots montados */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {ATTRIBUTE_SLOTS.map((s, i) => {
                        const chosen = build[s.attribute_name];
                        return (
                          <motion.button
                            key={s.attribute_name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => chosen && setBuild((b) => { const n = { ...b }; delete n[s.attribute_name]; return n; })}
                            aria-label={chosen ? `${s.label}: ${chosen.name}. Tocar para limpar.` : `${s.label}: vazio`}
                            className={cx("flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all", chosen ? "border-blood/40 bg-blood/[0.06] shadow-[0_0_16px_-6px_rgba(225,29,42,0.2)]" : "border-dashed border-line bg-transparent")}
                          >
                            <div className={cx("grid size-10 shrink-0 place-items-center rounded-lg", chosen ? "bg-blood/15" : "bg-ink-3")}>
                              <SlotIcon name={s.icon} className={cx("size-5", chosen ? "text-blood-2" : "text-mist-2")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] uppercase tracking-wide text-mist">{s.label}</p>
                              <span className="block truncate text-xs font-bold">{chosen ? chosen.name : <span className="text-mist/50">vazio</span>}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.section>
                )}

                {stage === "ready" && (
                  <motion.section key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={stageTransition} className="flex flex-col gap-5">
                    <div>
                      <p className="eyebrow text-blood-2">Passo 3 de 3</p>
                      <h2 className="display mt-1.5 text-2xl">Como assistir</h2>
                    </div>
                    <div className="card p-5">
                      <p className="eyebrow mb-3">Velocidade</p>
                      <div className="grid grid-cols-3 gap-2.5">
                        {(["normal", "rapida", "ultra"] as Speed[]).map((s) => (
                          <button key={s} onClick={() => setSpeed(s)} className={cx("rounded-xl border p-3.5 text-center text-sm font-bold transition-all", speed === s ? "border-blood bg-blood/10 shadow-[0_0_20px_-4px_rgba(225,29,42,0.3)]" : "border-line bg-smoke hover:bg-smoke-2")}>
                            {s === "normal" ? "Normal" : s === "rapida" ? "Rápida" : "Ultra"}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2.5 text-xs text-mist">Controla o ritmo dos comentários round a round.</p>
                    </div>
                    <div className="card p-5">
                      <p className="eyebrow mb-3">Modo</p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={() => setAuto(false)} className={cx("rounded-xl border p-3.5 text-center text-sm font-bold transition-all", !auto ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_-4px_rgba(245,181,63,0.3)]" : "border-line bg-smoke hover:bg-smoke-2")}>Luta a luta</button>
                        <button onClick={() => setAuto(true)} className={cx("rounded-xl border p-3.5 text-center text-sm font-bold transition-all", auto ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_-4px_rgba(245,181,63,0.3)]" : "border-line bg-smoke hover:bg-smoke-2")}>Automático</button>
                      </div>
                      <p className="mt-2.5 text-xs text-mist">{auto ? "As 8 lutas rodam sozinhas, uma após a outra." : "Você clica para avançar a cada luta."}</p>
                    </div>
                    <HoverButton className="w-full disabled:opacity-40" onClick={startCareer} disabled={busy}>Começar carreira →</HoverButton>
                    <button onClick={() => setStage("build")} className="text-center text-xs text-mist underline transition hover:text-white">← voltar a montar</button>
                  </motion.section>
                )}

                {stage === "loading" && (
                  <motion.section key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={stageTransition}>
                    <div className="card grid place-items-center gap-5 p-12">
                      <div className="pulse-ring grid size-20 place-items-center rounded-full bg-blood/80 shadow-[0_0_40px_-8px_rgba(225,29,42,0.6)]"><Swords className="size-9 text-white" strokeWidth={1.8} /></div>
                      <Spinner label="Montando o card…" />
                      <p className="text-xs text-mist/60">Buscando adversários dignos</p>
                    </div>
                  </motion.section>
                )}

                {stage === "fight" && result && player && (
                  <motion.section key={`fight-${idx}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={stageTransition} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cx("rounded-full px-3 py-1.5 font-bold", idx >= 6 ? "bg-gold/15 text-gold shadow-[0_0_12px_-2px_rgba(245,181,63,0.3)]" : "bg-blood/12 text-blood-2")}>{fightLabel(idx)} · {roundsFor(idx)} rounds</span>
                      <span className="text-mist">Cartel {record.w}–{record.l} · {idx + 1}/{TOTAL}</span>
                    </div>
                    <FightPlayback result={result} aName={player.name} bName={oppName} playerWon={playerWon} ctaLabel={ctaLabel} onContinue={afterFight} speed={speed} onSpeed={setSpeed} auto={auto} onAuto={setAuto} />
                  </motion.section>
                )}

                {stage === "gameover" && (
                  <motion.section key="over" initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", damping: 18, stiffness: 220 }} className="card p-10 text-center">
                    <div className="mx-auto grid size-20 place-items-center rounded-full bg-blood/10"><Skull className="size-10 text-blood-2" strokeWidth={1.5} /></div>
                    <h2 className="display mt-4 text-3xl text-glow">Fim da campanha</h2>
                    <p className="mt-2 text-mist">Você caiu na {fightLabel(idx)}. Cartel final: <strong className="text-white">{record.w} vitórias</strong>.</p>
                    <div className="mt-8 flex justify-center"><MagneticCta className="w-full" onClick={newRun}>Tentar de novo</MagneticCta></div>
                  </motion.section>
                )}

                {stage === "champion" && (
                  <motion.section key="champ" initial={{ opacity: 0, scale: 0.88, filter: "blur(8px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} transition={{ type: "spring", damping: 14 }} className="card-hairline overflow-hidden text-center">
                    <div className="bg-gradient-to-b from-gold/25 to-transparent px-6 py-10">
                      <BeltBadge className="mx-auto mb-4" size={96} />
                      <h2 className="punch-in display gold-glow text-4xl">CAMPEÃO!</h2>
                      <p className="mt-3 text-white/80"><strong>{name}</strong> venceu as 8 lutas e conquistou o cinturão. Invicto: 8–0.</p>
                    </div>
                    <div className="p-5"><MagneticCta tone="gold" className="w-full" onClick={newRun}>Jogar de novo</MagneticCta></div>
                  </motion.section>
                )}
              </AnimatePresence>

              {stage === "build" && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur-lg">
                  <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3.5">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-mist">
                        <span>{filled}/{ATTRIBUTE_SLOTS.length} montados</span>
                        {filled < ATTRIBUTE_SLOTS.length && <span className="text-mist/60">vazios viram 50</span>}
                      </div>
                      <div className="mt-1.5"><StatBar value={(filled / ATTRIBUTE_SLOTS.length) * 100} tone="gold" /></div>
                    </div>
                    <HoverButton className="shrink-0 disabled:opacity-40" onClick={() => setStage("ready")} disabled={busy}>Lutar →</HoverButton>
                  </div>
                </div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <FighterAssignSheet
        fighter={selected}
        build={build}
        onAssign={(attr) => {
          if (selected) {
            const value = num(selected.attrs?.[attr]);
            setBuild((b) => ({ ...b, [attr]: { fighter_id: selected.fighter_id, name: selected.name, nickname: selected.nickname, value } }));
            setBatch([]);
          }
          setSelected(null);
        }}
        onClose={() => setSelected(null)}
      />
    </MotionConfig>
  );
}
