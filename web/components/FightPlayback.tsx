"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimEvent, SimResult } from "@/lib/types";
import { Button } from "./ui";
import { HoverButton } from "./ui/hover-button";

const ICON: Record<string, string> = {
  round_start: "🔔", round_end: "⏱️", strike: "🥊", knockdown: "💥",
  takedown: "🤼", takedown_stuffed: "🛡️", control: "🔒", submission_attempt: "🧶",
  submission: "🏳️", sweep: "🔄", ko: "💀", tko: "💀", decision: "📋",
};

const METHOD_PT: Record<string, string> = {
  "KO/TKO": "Nocaute (KO/TKO)",
  Submission: "Finalização",
  Decision: "Decisão dos juízes",
  Draw: "Empate",
};

function EventRow({ e, aName }: { e: SimEvent; aName: string }) {
  const mine = e.actor === aName;
  const big = ["ko", "tko", "submission", "knockdown"].includes(e.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: mine ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      className="flex items-start gap-3 py-1.5"
    >
      <span className="mt-0.5 w-10 shrink-0 text-right font-mono text-xs text-mist">{e.clock}</span>
      <span className={big ? "text-xl" : "text-base"}>{ICON[e.type] ?? "•"}</span>
      <div className="min-w-0 flex-1">
        <p className={big ? "font-extrabold text-glow" : "text-sm"}>
          {e.actor && <span className="font-semibold">{e.actor}</span>} {e.detail}
        </p>
        {e.source && (
          <p className="text-[11px] text-gold/80">
            via {labelAttr(e.attribute)} de <span className="font-semibold">{e.source}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}

function labelAttr(a?: string) {
  const m: Record<string, string> = {
    power: "poder de mão", kicks: "chute", takedownOffense: "wrestling",
    takedownDefense: "defesa de queda", groundControl: "controle no chão",
    submission: "finalização", recovery: "recuperação", volume: "volume",
  };
  return a ? m[a] ?? a : "";
}

export function FightPlayback({
  result,
  narrative,
  aName,
  bName,
  onRestart,
}: {
  result: SimResult;
  narrative: string | null;
  aName: string;
  bName: string;
  onRestart: () => void;
}) {
  const events = useMemo(
    () => result.events.filter((e) => e.actor || e.type === "decision" || e.type === "round_start"),
    [result.events],
  );
  const [n, setN] = useState(0);
  const done = n >= events.length;
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setN((x) => x + 1), 420);
    return () => clearTimeout(t);
  }, [n, done]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [n]);

  const shown = events.slice(0, n);
  let lastRound = 0;
  const isFinish = result.method === "KO/TKO" || result.method === "Submission";

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-extrabold text-blood-2">{aName}</span>
          <span className="text-xs text-mist">vs</span>
          <span className="font-extrabold">{bName}</span>
        </div>
      </div>

      <div ref={feedRef} className="card max-h-[46dvh] overflow-y-auto p-4">
        {shown.map((e, i) => {
          const header = e.round !== lastRound ? ((lastRound = e.round), true) : false;
          return (
            <div key={i}>
              {header && (
                <div className="my-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-mist">
                  <span className="h-px flex-1 bg-line" /> Round {e.round} <span className="h-px flex-1 bg-line" />
                </div>
              )}
              <EventRow e={e} aName={aName} />
            </div>
          );
        })}
        {!done && (
          <div className="py-3 text-center text-xs text-mist">
            <button onClick={() => setN(events.length)} className="underline">pular para o fim</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 220 }}
            className={`card relative overflow-hidden ${isFinish ? "shake" : ""}`}
          >
            {isFinish && (
              <div className="impact-flash pointer-events-none absolute inset-0 z-20 bg-white" aria-hidden />
            )}
            <div className="bg-gradient-to-b from-blood/20 to-transparent p-5 text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-mist">Resultado</p>
              <h2 className="punch-in mt-1 text-3xl font-black text-glow">
                {result.winner ?? "Empate"}
              </h2>
              <p className="mt-1 text-gold gold-glow">
                {METHOD_PT[result.method] ?? result.method}
                {result.method !== "Decision" && result.method !== "Draw" && ` · R${result.round} ${result.clock}`}
              </p>
              <p className="mt-2 text-xs text-mist">
                Pontuação {result.scorecards.a} – {result.scorecards.b}
              </p>
            </div>

            {narrative ? (
              <div className="border-t border-line p-5">
                <p className="mb-2 text-[11px] uppercase tracking-widest text-mist">Narração</p>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">{narrative}</div>
              </div>
            ) : (
              <div className="border-t border-line p-4 text-center text-xs text-mist">
                Narração de IA desativada (configure <code className="text-gold">ANTHROPIC_API_KEY</code> na função).
              </div>
            )}

            <div className="flex gap-3 border-t border-line p-4">
              <HoverButton className="flex-1" onClick={onRestart}>Nova luta</HoverButton>
              <Button
                variant="ghost"
                onClick={() => {
                  const txt = `${aName} vs ${bName} → ${result.winner ?? "Empate"} por ${METHOD_PT[result.method] ?? result.method} (Octógono dos Sonhos)`;
                  navigator.clipboard?.writeText(txt);
                }}
              >
                Copiar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
