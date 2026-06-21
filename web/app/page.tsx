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
import { FightPlayback } from "@/components/FightPlayback";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HoverButton } from "@/components/ui/hover-button";
import { MagneticCta } from "@/components/ui/magnetic-cta";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Toast } from "@/components/ui/toast";
import { Landing } from "@/components/Landing";

type Stage = "intro" | "create" | "build" | "loading" | "fight" | "gameover" | "champion";
const TOTAL = 8;
const num = (x: unknown) => Number(x) || 0;

// Estilo (postura) e arte principal: buff (+10%) na área escolhida, nerf (-10%) na oposta.
const STANCES: Record<string, { label: string; emoji: string; buff: string[]; nerf: string[] }> = {
  defensivo: { label: "Defensivo", emoji: "🛡️", buff: ["queixo", "defesa_queda", "recuperacao"], nerf: ["poder_de_mao", "volume_velocidade"] },
  equilibrado: { label: "Equilibrado", emoji: "⚖️", buff: [], nerf: [] },
  agressivo: { label: "Agressivo", emoji: "🔥", buff: ["poder_de_mao", "volume_velocidade"], nerf: ["queixo", "defesa_queda"] },
};
const DISCIPLINES: Record<string, { label: string; emoji: string; buff: string[]; nerf: string[] }> = {
  jiu_jitsu: { label: "Jiu-Jitsu", emoji: "🥋", buff: ["finalizacao", "controle_chao"], nerf: ["poder_de_mao"] },
  boxe: { label: "Boxe", emoji: "🥊", buff: ["poder_de_mao", "volume_velocidade"], nerf: ["controle_chao"] },
  wrestling: { label: "Wrestling", emoji: "🤼", buff: ["wrestling_quedas", "controle_chao"], nerf: ["chute_perna"] },
  muay_thai: { label: "Muay Thai", emoji: "🦵", buff: ["chute_perna", "poder_de_mao"], nerf: ["wrestling_quedas"] },
  karate: { label: "Karatê", emoji: "🐉", buff: ["chute_perna", "volume_velocidade"], nerf: ["finalizacao"] },
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
  const scale = 0.95 + index * 0.05; // tougher toward the main event
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
  const [stance, setStance] = useState<string>("equilibrado");
  const [discipline, setDiscipline] = useState<string>("boxe");
  const [build, setBuild] = useState<Build>({});
  const [batch, setBatch] = useState<FullFighter[]>([]);
  const [rolling, setRolling] = useState(false);
  const [rerolls, setRerolls] = useState(3);
  const [selected, setSelected] = useState<FullFighter | null>(null);

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
  // Main roll: only when the current batch was resolved (assigned), so you can't
  // fish endlessly. Re-roll: discard the current 10 without assigning — max 3/session.
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
        const value = Math.max(1, Math.min(99, Math.round(base * modFactor(s.attribute_name, stance, discipline))));
        return { attr: s.attribute_name, value, source: o?.name };
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
            <Landing onStart={() => setStage("create")} />
          </motion.div>
        ) : (
          <motion.div key="game" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <main className="relative mx-auto w-full max-w-xl px-4 pb-28 pt-6">
              <header className="mb-6 text-center">
                <p className="eyebrow">Octógono dos Sonhos</p>
                <h1 className="display mt-1 text-3xl text-glow">MEU LUTADOR</h1>
              </header>

              <AnimatePresence mode="wait">
                {stage === "create" && (
                  <motion.section key="create" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col gap-4">
                    <div>
                      <p className="eyebrow">Passo 1 de 3</p>
                      <h2 className="display mt-1 text-2xl">Crie seu personagem</h2>
                    </div>

                    <div className="card p-4">
                      <label htmlFor="fighter-name" className="eyebrow">Nome</label>
                      <input id="fighter-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border border-line bg-ink-3 px-3 py-2 font-bold outline-none transition focus:border-blood" />
                    </div>

                    <div className="card p-4">
                      <p className="eyebrow mb-2">Estilo</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(STANCES).map(([k, vv]) => (
                          <button key={k} onClick={() => setStance(k)} className={cx("rounded-xl border p-3 text-center transition", stance === k ? "border-blood bg-blood/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]")}>
                            <div className="text-xl" aria-hidden>{vv.emoji}</div>
                            <div className="mt-1 text-xs font-bold">{vv.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="card p-4">
                      <p className="eyebrow mb-2">Arte principal</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {Object.entries(DISCIPLINES).map(([k, vv]) => (
                          <button key={k} onClick={() => setDiscipline(k)} className={cx("rounded-xl border p-3 text-center transition", discipline === k ? "border-gold bg-gold/10" : "border-line bg-white/[0.03] hover:bg-white/[0.06]")}>
                            <div className="text-xl" aria-hidden>{vv.emoji}</div>
                            <div className="mt-1 text-[11px] font-bold leading-tight">{vv.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="card p-4 text-sm">
                      <p className="eyebrow mb-2">Efeito do estilo</p>
                      {(() => {
                        const ups = new Set<string>(), downs = new Set<string>();
                        for (const m of [STANCES[stance], DISCIPLINES[discipline]]) {
                          m?.buff.forEach((a) => ups.add(a));
                          m?.nerf.forEach((a) => downs.add(a));
                        }
                        for (const a of [...ups]) if (downs.has(a)) { ups.delete(a); downs.delete(a); }
                        return (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-emerald-300">▲ +10% {[...ups].map((a) => LABEL_BY_ATTR[a]).join(", ") || "—"}</p>
                            <p className="text-blood-2">▼ −10% {[...downs].map((a) => LABEL_BY_ATTR[a]).join(", ") || "—"}</p>
                          </div>
                        );
                      })()}
                    </div>

                    <MagneticCta className="w-full" onClick={newRun}>Continuar →</MagneticCta>
                  </motion.section>
                )}

                {stage === "build" && (
                  <motion.section key="build" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex flex-col gap-4">
                    <div>
                      <p className="eyebrow">Passo 2 de 3</p>
                      <h2 className="display mt-1 text-2xl">Monte seu lutador</h2>
                    </div>

                    <div className="card flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="truncate font-bold">{name || "Meu Lutador"}</span>
                      <span className="shrink-0 text-xs text-mist">{STANCES[stance]?.emoji} {STANCES[stance]?.label} · {DISCIPLINES[discipline]?.emoji} {DISCIPLINES[discipline]?.label}</span>
                    </div>

                    {/* DADO + sorteio */}
                    <div className="card flex flex-col items-center gap-3 p-4">
                      <Dice rolling={rolling} disabled={batch.length > 0} onRoll={rollMain} />
                      <p className="text-center text-xs text-mist">
                        Role o dado, toque num lutador e escolha <strong className="text-white">o atributo</strong> dele.
                        Só depois você rola de novo. Re-sorteios: <strong className="text-gold">{rerolls}</strong> na sessão.
                      </p>
                      {batch.length > 0 && (
                        <button
                          onClick={reroll}
                          disabled={rolling || rerolls <= 0}
                          className="rounded-full border border-line bg-white/5 px-4 py-1.5 text-xs font-bold text-mist-2 transition hover:text-white disabled:opacity-40"
                        >
                          🎲 Re-sortear estes 10 ({rerolls})
                        </button>
                      )}
                      <div className="grid w-full grid-cols-2 gap-2">
                        {rolling && batch.length === 0 ? (
                          <div className="col-span-2 grid place-items-center py-6"><Spinner label="Sorteando…" /></div>
                        ) : batch.length === 0 ? (
                          <p className="col-span-2 py-6 text-center text-sm text-mist">Role o dado para sortear 10 lutadores.</p>
                        ) : (
                          batch.map((f, i) => (
                            <motion.button
                              key={f.fighter_id + i}
                              initial={{ opacity: 0, y: 10, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: Math.min(i * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setSelected(f)}
                              className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] p-2.5 text-left transition hover:border-gold/40 hover:bg-white/[0.06]"
                            >
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-3 text-base" aria-hidden>🥊</div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-bold">{f.name}</span>
                                <span className="block truncate text-[10px] text-mist">{f.nickname ? `“${f.nickname}”` : "toque para encaixar"}</span>
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* slots montados */}
                    <div className="grid grid-cols-2 gap-2">
                      {ATTRIBUTE_SLOTS.map((s) => {
                        const chosen = build[s.attribute_name];
                        return (
                          <button
                            key={s.attribute_name}
                            onClick={() => chosen && setBuild((b) => { const n = { ...b }; delete n[s.attribute_name]; return n; })}
                            aria-label={chosen ? `${s.label}: ${chosen.name}. Tocar para limpar.` : `${s.label}: vazio`}
                            className={cx("flex items-center gap-2 rounded-xl border p-2.5 text-left transition", chosen ? "border-blood/50 bg-blood/[0.06]" : "border-dashed border-line bg-transparent")}
                          >
                            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-3 font-black text-gold">
                              {chosen ? Math.round(num(chosen.value)) : <span aria-hidden>{s.emoji}</span>}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] uppercase tracking-wide text-mist">{s.label}</p>
                              <span className="block truncate text-xs font-bold">{chosen ? chosen.name : <span className="text-mist">vazio</span>}</span>
                            </div>
                          </button>
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
                        {filled < ATTRIBUTE_SLOTS.length && <span>vazios viram 50</span>}
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

      <FighterAssignSheet
        fighter={selected}
        build={build}
        onAssign={(attr) => {
          if (selected) {
            const value = num(selected.attrs?.[attr]);
            setBuild((b) => ({ ...b, [attr]: { fighter_id: selected.fighter_id, name: selected.name, nickname: selected.nickname, value } }));
            setBatch([]); // consume the roll — you must roll again for the next pick
          }
          setSelected(null);
        }}
        onClose={() => setSelected(null)}
      />
    </MotionConfig>
  );
}
