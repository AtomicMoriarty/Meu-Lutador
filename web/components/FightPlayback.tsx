"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowUpRight, Ban, Bell, CircleDot, ClipboardList, Clock,
  Crosshair, Flame, Flag, Hammer, HeartPulse, Link, Lock,
  RefreshCw, Shield, Shuffle, Skull, Target, Wind, Zap,
  type LucideIcon,
} from "lucide-react";
import type { SimEvent, SimResult } from "@/lib/engine";
import { HoverButton } from "./ui/hover-button";
import { cx } from "./ui";

export type Speed = "normal" | "rapida" | "ultra";
const DELAYS: Record<Speed, { base: number; big: number }> = {
  normal: { base: 620, big: 1150 },
  rapida: { base: 330, big: 680 },
  ultra: { base: 140, big: 320 },
};
const SPEED_LABEL: Record<Speed, string> = { normal: "Normal", rapida: "Rápida", ultra: "Ultra" };

const ICON: Record<string, LucideIcon> = {
  round_start: Bell, round_end: Clock, strike: Crosshair, big_strike: Zap, kick: ArrowUpRight,
  miss: Wind, knockdown: Target, hurt: Shield, swarm: Flame, recover: HeartPulse, saved_by_bell: Bell,
  takedown: ArrowDown, takedown_stuffed: Shield, control: Lock, ground_strikes: Hammer, sweep: RefreshCw,
  scramble: Shuffle, submission_attempt: Link, submission: Flag, ko: Skull, tko: Skull,
  foul: Ban, decision: ClipboardList,
};
const BIG = new Set(["knockdown", "hurt", "ko", "tko", "submission", "big_strike", "foul"]);
const ATTR_PT: Record<string, string> = {
  power: "poder", kicks: "chute", takedownOffense: "wrestling", takedownDefense: "defesa de queda",
  groundControl: "controle", submission: "finalização", recovery: "recuperação", volume: "volume",
};

function EventIcon({ type, big }: { type: string; big: boolean }) {
  const Icon = ICON[type];
  if (!Icon) return <CircleDot className="size-3.5 text-mist/50" strokeWidth={1.5} />;
  return <Icon className={big ? "size-5 text-blood-2" : "size-4 text-mist-2"} strokeWidth={big ? 2 : 1.5} />;
}

function Row({ e, aName }: { e: SimEvent; aName: string }) {
  const mine = e.actor === aName;
  const big = BIG.has(e.type);
  return (
    <motion.div initial={{ opacity: 0, x: mine ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", damping: 24, stiffness: 320 }} className="flex items-start gap-3 py-1.5">
      <span className="mt-0.5 w-10 shrink-0 text-right font-mono text-xs text-mist">{e.clock}</span>
      <span className="mt-0.5 flex shrink-0 items-center justify-center" aria-hidden><EventIcon type={e.type} big={big} /></span>
      <div className="min-w-0 flex-1">
        <p className={big ? "font-extrabold text-glow" : "text-sm"}>
          {e.actor && <span className={mine ? "text-blood-2" : "text-white"}>{e.actor} </span>}
          {e.detail}
        </p>
        {e.source && (
          <p className="text-[11px] text-gold/80">via {ATTR_PT[e.attribute ?? ""] ?? e.attribute} de <span className="font-semibold">{e.source}</span></p>
        )}
      </div>
    </motion.div>
  );
}

export function FightPlayback({
  result, aName, bName, playerWon, ctaLabel, onContinue,
  speed, onSpeed, auto, onAuto,
}: {
  result: SimResult; aName: string; bName: string; playerWon: boolean; ctaLabel: string;
  onContinue: () => void;
  speed: Speed; onSpeed: (s: Speed) => void; auto: boolean; onAuto: (b: boolean) => void;
}) {
  const events = useMemo(() => result.events, [result.events]);
  const [n, setN] = useState(0);
  const done = n >= events.length;
  const feedRef = useRef<HTMLDivElement>(null);
  const isFinish = result.method === "KO/TKO" || result.method === "Submission";

  useEffect(() => {
    if (done) return;
    const cur = events[n];
    const d = DELAYS[speed];
    const delay = cur && BIG.has(cur.type) ? d.big : d.base;
    const t = setTimeout(() => setN((x) => x + 1), delay);
    return () => clearTimeout(t);
  }, [n, done, events, speed]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [n]);

  // auto mode: advance to the next fight on its own
  useEffect(() => {
    if (done && auto) {
      const t = setTimeout(onContinue, 2400);
      return () => clearTimeout(t);
    }
  }, [done, auto, onContinue]);

  let lastRound = 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="card-hairline p-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
          <div className="min-w-0 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-blood-2/80">Você</span>
            <p className="truncate font-extrabold text-blood-2">{aName}</p>
          </div>
          <span className="display px-1 text-base text-mist">VS</span>
          <div className="min-w-0 text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-mist">Desafiante</span>
            <p className="truncate font-extrabold text-white">{bName}</p>
          </div>
        </div>
        {/* speed + auto controls */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line text-[11px] font-bold">
            {(["normal", "rapida", "ultra"] as Speed[]).map((s) => (
              <button key={s} onClick={() => onSpeed(s)} className={cx("px-2.5 py-1 transition", speed === s ? "bg-blood text-white" : "text-mist hover:text-white")}>
                {SPEED_LABEL[s]}
              </button>
            ))}
          </div>
          <button onClick={() => onAuto(!auto)} className={cx("rounded-lg border px-2.5 py-1 text-[11px] font-bold transition", auto ? "border-gold/50 bg-gold/15 text-gold" : "border-line text-mist hover:text-white")}>
            {auto ? "▶ Auto ligado" : "Auto desligado"}
          </button>
        </div>
      </div>

      <div ref={feedRef} className="card relative max-h-[46dvh] overflow-y-auto p-4 scroll-smooth">
        {events.slice(0, n).map((e, i) => {
          const header = e.round !== lastRound && e.type === "round_start" ? ((lastRound = e.round), true) : false;
          return (
            <div key={i}>
              {header && (
                <div className="my-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-mist">
                  <span className="h-px flex-1 bg-line" /> Round {e.round} <span className="h-px flex-1 bg-line" />
                </div>
              )}
              {e.type !== "round_start" && <Row e={e} aName={aName} />}
            </div>
          );
        })}
      </div>

      {/* skip — fixed corner, never moves with the feed */}
      {!done && (
        <button
          onClick={() => setN(events.length)}
          className="fixed bottom-5 right-4 z-40 rounded-full border border-line bg-ink-3/90 px-4 py-2.5 text-xs font-bold text-mist-2 shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-lg transition hover:border-blood/40 hover:text-white"
        >
          Pular ⏭
        </button>
      )}

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", damping: 20, stiffness: 220 }} className={cx("card relative overflow-hidden", isFinish && "shake")}>
            {isFinish && <div className="impact-flash pointer-events-none absolute inset-0 z-20 bg-white" aria-hidden />}
            <div className={`bg-gradient-to-b ${playerWon ? "from-gold/25" : "from-blood/25"} to-transparent p-5 text-center`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-mist">{playerWon ? "Vitória" : "Derrota"}</p>
              <h2 className="punch-in mt-1 text-3xl font-black text-glow">{result.winner ?? "Empate"}</h2>
              <p className="mt-1 text-gold gold-glow">
                {result.decision}
                {isFinish && ` · R${result.round} ${result.clock}`}
              </p>
            </div>

            {result.method === "Decision" || result.method === "Draw" ? (
              <div className="border-t border-line p-4">
                <p className="mb-2 text-center text-[11px] uppercase tracking-widest text-mist">Cartões dos juízes</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {result.judges.map((j, i) => (
                    <div key={i} className="rounded-lg bg-white/5 py-2">
                      <p className="text-[10px] text-mist">Juiz {i + 1}</p>
                      <p className="font-mono font-bold">{j.a} x {j.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-line p-4">
              {auto ? (
                <p className="text-center text-sm text-mist">Próxima luta automática…</p>
              ) : (
                <HoverButton className="w-full" onClick={onContinue}>{ctaLabel}</HoverButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
