"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { drawFight, getSlotOptions, simulateFight } from "@/lib/api";
import {
  WEIGHT_CLASSES,
  WC_LABEL,
  type AttributeSlot,
  type DrawResponse,
  type SimulateResponse,
  type SlotOption,
} from "@/lib/types";
import { Button, ConfidenceBadge, Spinner, StatBar, cx } from "@/components/ui";
import { SlotSheet } from "@/components/SlotSheet";
import { FightPlayback } from "@/components/FightPlayback";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HoverButton } from "@/components/ui/hover-button";

type Stage = "intro" | "build" | "simulating" | "result";
const rndOf = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const RIVAL_NAMES = ["O Desafiante", "Sombra", "O Carrasco", "Pesadelo", "O Invicto", "Fúria"];

export default function Page() {
  const [stage, setStage] = useState<Stage>("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draw, setDraw] = useState<DrawResponse | null>(null);
  const [name, setName] = useState("Meu Lutador");
  const [picks, setPicks] = useState<Record<string, SlotOption>>({});
  const [cache, setCache] = useState<Record<string, SlotOption[]>>({});
  const [active, setActive] = useState<AttributeSlot | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const [sim, setSim] = useState<SimulateResponse | null>(null);
  const [oppName, setOppName] = useState("O Desafiante");

  async function startDraw(weightClass?: string) {
    setError(null);
    setBusy(true);
    try {
      const d = await drawFight(weightClass);
      setDraw(d);
      setPicks({});
      setCache({});
      setStage("build");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function openSlot(slot: AttributeSlot) {
    setActive(slot);
    if (cache[slot.attribute_name] || !draw) return;
    setSheetLoading(true);
    try {
      const r = await getSlotOptions(draw.weight_class, draw.anchor_event.id, slot.attribute_name);
      setCache((c) => ({ ...c, [slot.attribute_name]: r.options }));
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setSheetLoading(false);
    }
  }

  async function ensureAll(): Promise<Record<string, SlotOption[]>> {
    if (!draw) return cache;
    const missing = draw.attribute_slots.filter((s) => !cache[s.attribute_name]);
    if (missing.length === 0) return cache;
    const loaded = await Promise.all(
      missing.map((s) =>
        getSlotOptions(draw.weight_class, draw.anchor_event.id, s.attribute_name).then(
          (r) => [s.attribute_name, r.options] as const,
        ),
      ),
    );
    const next = { ...cache, ...Object.fromEntries(loaded) };
    setCache(next);
    return next;
  }

  async function randomFill() {
    const all = await ensureAll().catch((e) => (setError(String(e)), null));
    if (!all || !draw) return;
    const next: Record<string, SlotOption> = { ...picks };
    for (const s of draw.attribute_slots) {
      const opts = all[s.attribute_name];
      if (opts?.length) next[s.attribute_name] = rndOf(opts);
    }
    setPicks(next);
  }

  async function simulate() {
    if (!draw) return;
    setBusy(true);
    setError(null);
    setStage("simulating");
    try {
      const all = await ensureAll();
      const myPicks: Record<string, string> = {};
      const oppPicks: Record<string, string> = {};
      for (const s of draw.attribute_slots) {
        const opts = all[s.attribute_name] ?? [];
        const mine = picks[s.attribute_name] ?? (opts.length ? rndOf(opts) : undefined);
        if (mine) myPicks[s.attribute_name] = mine.fighter_id;
        if (opts.length) {
          let pick = rndOf(opts);
          if (opts.length > 1 && mine) {
            for (let i = 0; i < 4 && pick.fighter_id === mine.fighter_id; i++) pick = rndOf(opts);
          }
          oppPicks[s.attribute_name] = pick.fighter_id;
        }
      }
      const rival = rndOf(RIVAL_NAMES);
      setOppName(rival);
      const res = await simulateFight({
        fighterA: { name: name || "Meu Lutador", picks: myPicks },
        fighterB: { name: rival, picks: oppPicks },
        rounds: 3,
      });
      setSim(res);
      setStage("result");
    } catch (e) {
      setError(String((e as Error).message));
      setStage("build");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setSim(null);
    setStage("intro");
  }

  const filledCount = draw ? draw.attribute_slots.filter((s) => picks[s.attribute_name]).length : 0;
  const avg =
    filledCount > 0
      ? Math.round(
          Object.values(picks).reduce((a, p) => a + p.value, 0) / Object.values(picks).length,
        )
      : 0;

  return (
    <main className="relative mx-auto w-full max-w-xl px-4 pb-28 pt-6">
      {/* subtle animated octagon-glow backdrop */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-60 transition-opacity duration-700"
        style={{ opacity: stage === "intro" ? 0.7 : 0.32 }}
        aria-hidden
      >
        <BackgroundGradientAnimation interactive={false} />
      </div>

      <header className="mb-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-mist">Octógono dos Sonhos</p>
        <h1 className="text-3xl font-black tracking-tight text-glow">MEU LUTADOR</h1>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-blood/40 bg-blood/10 p-3 text-sm text-blood-2">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ---------------- INTRO ---------------- */}
        {stage === "intro" && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-4"
          >
            <div className="card p-5 text-center">
              <p className="text-sm leading-relaxed text-white/80">
                Sorteie uma <strong>categoria</strong> e uma <strong>era</strong>, monte seu lutador
                herdando cada atributo de uma fera real que competiu ali, e veja a luta acontecer.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {WEIGHT_CLASSES.map((w) => (
                <Button key={w.code} variant="ghost" disabled={busy} onClick={() => startDraw(w.code)}>
                  {w.label}
                </Button>
              ))}
            </div>

            <HoverButton
              className="w-full disabled:opacity-40"
              disabled={busy}
              onClick={() => startDraw()}
            >
              {busy ? "Sorteando…" : "🎲 Surpreenda-me"}
            </HoverButton>
          </motion.section>
        )}

        {/* ---------------- BUILD ---------------- */}
        {stage === "build" && draw && (
          <motion.section
            key="build"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="flex flex-col gap-4"
          >
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blood/15 px-3 py-1 text-xs font-bold text-blood-2">
                  {WC_LABEL[draw.weight_class] ?? draw.weight_class}
                </span>
                <span className="text-xs text-mist">{draw.pool_size} lutadores no pool</span>
              </div>
              <p className="mt-2 text-sm font-semibold">{draw.anchor_event.name}</p>
              <p className="text-xs text-mist">
                era ±{draw.window_months} meses · {draw.anchor_event.event_date}
              </p>
            </div>

            <div className="card p-4">
              <label className="text-[11px] uppercase tracking-widest text-mist">Nome do seu lutador</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-ink-3 px-3 py-2 font-bold outline-none focus:border-blood"
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {draw.attribute_slots.map((s) => {
                const chosen = picks[s.attribute_name];
                return (
                  <button
                    key={s.attribute_name}
                    onClick={() => openSlot(s)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                      chosen ? "border-blood/50 bg-blood/[0.06]" : "border-line bg-white/[0.02] hover:bg-white/[0.05]",
                    )}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-3 font-black text-gold">
                      {chosen ? Math.round(chosen.value) : "–"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-wide text-mist">{s.label}</p>
                      {chosen ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="truncate font-bold">{chosen.name}</span>
                            <ConfidenceBadge c={chosen.confidence} />
                          </div>
                          <div className="mt-1"><StatBar value={chosen.value} /></div>
                        </>
                      ) : (
                        <span className="text-sm text-mist">tocar para escolher de quem herdar</span>
                      )}
                    </div>
                    <span className="text-mist">›</span>
                  </button>
                );
              })}
            </div>

            <Button variant="ghost" onClick={randomFill} disabled={busy}>
              ⚡ Preencher tudo aleatoriamente
            </Button>
          </motion.section>
        )}

        {/* ---------------- SIMULATING ---------------- */}
        {stage === "simulating" && (
          <motion.section key="sim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card grid place-items-center gap-4 p-10">
              <div className="pulse-ring grid h-16 w-16 place-items-center rounded-full bg-blood text-2xl">🥊</div>
              <Spinner label="Simulando a luta…" />
            </div>
          </motion.section>
        )}

        {/* ---------------- RESULT ---------------- */}
        {stage === "result" && sim && (
          <motion.section key="res" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FightPlayback
              result={sim.result}
              narrative={sim.narrative}
              aName={name || "Meu Lutador"}
              bName={oppName}
              onRestart={restart}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* sticky action bar during build */}
      {stage === "build" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-mist">
                <span>{filledCount}/{draw?.attribute_slots.length} escolhidos</span>
                {avg > 0 && <span>média {avg}</span>}
              </div>
              <div className="mt-1"><StatBar value={(filledCount / (draw?.attribute_slots.length ?? 11)) * 100} tone="gold" /></div>
            </div>
            <HoverButton className="shrink-0 disabled:opacity-40" onClick={simulate} disabled={busy}>
              Simular luta
            </HoverButton>
          </div>
        </div>
      )}

      <SlotSheet
        slot={active}
        options={active ? cache[active.attribute_name] : undefined}
        loading={sheetLoading}
        current={active ? picks[active.attribute_name]?.fighter_id : undefined}
        onPick={(o) => {
          if (active) setPicks((p) => ({ ...p, [active.attribute_name]: o }));
          setActive(null);
        }}
        onClose={() => setActive(null)}
      />
    </main>
  );
}
