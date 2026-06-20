"use client";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useState } from "react";
import { randomFullFighters } from "@/lib/api";
import { ATTRIBUTE_SLOTS, type AttributeSlot, type Build, type FullFighter } from "@/lib/types";
import {
  makeFighter,
  simulate,
  ATTR_NAME_TO_KEY,
  type AttrKey,
  type FighterInput,
  type SimResult,
} from "@/lib/engine";
import { Spinner, StatBar, cx } from "@/components/ui";
import { SlotSheet } from "@/components/SlotSheet";
import { FightPlayback } from "@/components/FightPlayback";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HoverButton } from "@/components/ui/hover-button";
import { MagneticCta } from "@/components/ui/magnetic-cta";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Toast } from "@/components/ui/toast";
import { Landing } from "@/components/Landing";

type Stage = "intro" | "build" | "loading" | "fight" | "gameover" | "champion";
const TOTAL = 8;
const num = (x: unknown) => Number(x) || 0;

function toFighter(name: string, entries: { attr: string; value: number; source?: string }[]): FighterInput {
  const attrs: Partial<Record<AttrKey, { value: number; source?: string }>> = {};
  for (const e of entries) {
    const k = ATTR_NAME_TO_KEY[e.attr];
    if (k) attrs[k] = { value: e.value, source: e.source };
  }
  return makeFighter(name, attrs);
}

function buildOpponents(pool: FullFighter[]): FullFighter[] {
  const sorted = [...pool].sort((a, b) => num(a.overall) - num(b.overall));
  if (sorted.length === 0) return [];
  const out: FullFighter[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const idx = Math.min(sorted.length - 1, Math.round((i / (TOTAL - 1)) * (sorted.length - 1)));
    out.push(sorted[idx]!);
  }
  return out;
}

function opponentFighter(o: FullFighter, index: number): FighterInput {
  // Tougher ladder: ramps from ~0.95x (luta 1) up to ~1.30x (main event).
  const scale = 0.95 + index * 0.05;
  const entries = ATTRIBUTE_SLOTS.map((s) => ({
    attr: s.attribute_name,
    value: Math.max(1, Math.min(99, Math.round(num(o.attrs?.[s.attribute_name] ?? 50) * scale))),
    source: o.name,
  }));
  return toFighter(o.name || "Desafiante", entries);
}

const fightLabel = (i: number) => (i === 7 ? "MAIN EVENT" : i === 6 ? "CO-MAIN" : `Luta ${i + 1}`);
const roundsFor = (i: number): 3 | 5 => (i >= 6 ? 5 : 3);

export default function Page() {
  const [stage, setStage] = useState<Stage>("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("Meu Lutador");
  const [build, setBuild] = useState<Build>({});
  const [pool, setPool] = useState<FullFighter[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [active, setActive] = useState<AttributeSlot | null>(null);
  const [refreshes, setRefreshes] = useState(3);

  const [player, setPlayer] = useState<FighterInput | null>(null);
  const [opponents, setOpponents] = useState<FullFighter[]>([]);
  const [idx, setIdx] = useState(0);
  const [record, setRecord] = useState({ w: 0, l: 0 });
  const [result, setResult] = useState<SimResult | null>(null);
  const [playerWon, setPlayerWon] = useState(false);
  const [oppName, setOppName] = useState("");

  async function drawPool() {
    setPoolLoading(true);
    try {
      const p = await randomFullFighters(10);
      setPool(p);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setPoolLoading(false);
    }
  }

  function newRun() {
    setBuild({});
    setPool([]);
    setRefreshes(3);
    setRecord({ w: 0, l: 0 });
    setIdx(0);
    setResult(null);
    setStage("build");
    void drawPool();
  }

  function reroll() {
    if (refreshes <= 0 || poolLoading) return;
    setRefreshes((r) => r - 1);
    void drawPool();
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
        return { attr: s.attribute_name, value: o ? num(o.value) : 50, source: o?.name };
      });
      const p = toFighter(name || "Meu Lutador", entries);
      setPlayer(p);
      const oppoolRaw = await randomFullFighters(24);
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
  const avg = filled ? Math.round(Object.values(build).reduce((a, o) => a + num(o.value), 0) / filled) : 0;
  const ctaLabel = playerWon ? (idx >= TOTAL - 1 ? "🏆 Ver título" : "Próxima luta →") : "Ver resultado";

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700"
        style={{ opacity: stage === "intro" ? 0.7 : 0.3 }}
        aria-hidden
      >
        <BackgroundGradientAnimation interactive={false} />
      </div>

      <Toast message={error} onClose={() => setError(null)} />

      <AnimatePresence mode="wait">
        {stage === "intro" ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <Landing onStart={newRun} />
          </motion.div>
        ) : (
          <motion.div key="game" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <main className="relative mx-auto w-full max-w-xl px-4 pb-28 pt-6">
              <header className="mb-6 text-center">
                <p className="eyebrow">Octógono dos Sonhos</p>
                <h1 className="display mt-1 text-3xl text-glow">MEU LUTADOR</h1>
              </header>

              <AnimatePresence mode="wait">
                {stage === "build" && (
                  <motion.section key="build" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col gap-4">
                    <div>
                      <p className="eyebrow">Passo 1 de 3</p>
                      <h2 className="display mt-1 text-2xl">Monte seu lutador</h2>
                    </div>
                    <div className="card p-4">
                      <label htmlFor="fighter-name" className="eyebrow">Nome do seu lutador</label>
                      <input id="fighter-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-ink-3 px-3 py-2 font-bold outline-none transition focus:border-blood" />
                      <p className="mt-2 text-xs text-mist">
                        Sorteamos <strong className="text-white">10 feras</strong>. Em cada atributo, escolha de qual delas herdar — pode repetir a mesma fera.
                        Você tem <strong className="text-gold">{refreshes} re-sorteios</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {ATTRIBUTE_SLOTS.map((s, i) => {
                        const chosen = build[s.attribute_name];
                        return (
                          <motion.button
                            key={s.attribute_name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.32), ease: [0.22, 1, 0.36, 1] }}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => setActive(s)}
                            aria-label={chosen ? `${s.label}: ${chosen.name}, valor ${Math.round(num(chosen.value))}. Tocar para trocar.` : `${s.label}: tocar para escolher`}
                            className={cx("flex items-center gap-3 rounded-xl border p-3 text-left transition", chosen ? "border-blood/50 bg-blood/[0.06]" : "border-line bg-white/[0.02] hover:bg-white/[0.05]")}
                          >
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-3 font-black text-gold">
                              {chosen ? Math.round(num(chosen.value)) : <span aria-hidden>{s.emoji}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] uppercase tracking-wide text-mist">{s.label}</p>
                              {chosen ? (
                                <>
                                  <span className="block truncate font-bold">{chosen.name}</span>
                                  <div className="mt-1"><StatBar value={num(chosen.value)} /></div>
                                </>
                              ) : (
                                <span className="text-sm text-mist">tocar para escolher</span>
                              )}
                            </div>
                            <span className="text-mist" aria-hidden>›</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.section>
                )}

                {stage === "loading" && (
                  <motion.section key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="card grid place-items-center gap-4 p-10">
                      <div className="pulse-ring grid h-16 w-16 place-items-center rounded-full bg-blood text-2xl">🥊</div>
                      <Spinner label="Montando o card…" />
                    </div>
                  </motion.section>
                )}

                {stage === "fight" && result && player && (
                  <motion.section key={`fight-${idx}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cx("rounded-full px-3 py-1 font-bold", idx >= 6 ? "bg-gold/20 text-gold" : "bg-blood/15 text-blood-2")}>{fightLabel(idx)} · {roundsFor(idx)} rounds</span>
                      <span className="text-mist">Cartel {record.w}–{record.l} · {idx + 1}/{TOTAL}</span>
                    </div>
                    <FightPlayback result={result} aName={player.name} bName={oppName} playerWon={playerWon} ctaLabel={ctaLabel} onContinue={afterFight} />
                  </motion.section>
                )}

                {stage === "gameover" && (
                  <motion.section key="over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 18, stiffness: 220 }} className="card p-8 text-center">
                    <p className="text-5xl">💀</p>
                    <h2 className="display mt-2 text-2xl text-glow">Fim da campanha</h2>
                    <p className="mt-1 text-mist">Você caiu na {fightLabel(idx)}. Cartel final: <strong className="text-white">{record.w} vitórias</strong>.</p>
                    <div className="mt-6 flex justify-center"><MagneticCta className="w-full" onClick={newRun}>Tentar de novo</MagneticCta></div>
                  </motion.section>
                )}

                {stage === "champion" && (
                  <motion.section key="champ" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 14 }} className="card-hairline overflow-hidden text-center">
                    <div className="bg-gradient-to-b from-gold/30 to-transparent p-8">
                      <BeltBadge className="mx-auto mb-3" size={88} />
                      <h2 className="punch-in display gold-glow text-3xl">CAMPEÃO!</h2>
                      <p className="mt-2 text-white/80"><strong>{name}</strong> venceu as 8 lutas e conquistou o cinturão. Invicto: 8–0.</p>
                    </div>
                    <div className="p-4"><MagneticCta tone="gold" className="w-full" onClick={newRun}>Jogar de novo</MagneticCta></div>
                  </motion.section>
                )}
              </AnimatePresence>

              {stage === "build" && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur">
                  <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-mist">
                        <span>{filled}/{ATTRIBUTE_SLOTS.length} montados</span>
                        {avg > 0 && <span>média {avg}</span>}
                      </div>
                      <div className="mt-1"><StatBar value={(filled / ATTRIBUTE_SLOTS.length) * 100} tone="gold" /></div>
                    </div>
                    <HoverButton className="shrink-0 disabled:opacity-40" onClick={startCareer} disabled={busy}>Lutar →</HoverButton>
                  </div>
                </div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <SlotSheet
        slot={active}
        pool={pool}
        loading={poolLoading}
        current={active ? build[active.attribute_name]?.fighter_id : undefined}
        refreshesLeft={refreshes}
        onRefresh={reroll}
        onPick={(f) => {
          if (active) {
            const value = num(f.attrs?.[active.attribute_name]);
            setBuild((b) => ({
              ...b,
              [active.attribute_name]: { fighter_id: f.fighter_id, name: f.name, nickname: f.nickname, value },
            }));
          }
          setActive(null);
        }}
        onClose={() => setActive(null)}
      />
    </MotionConfig>
  );
}
