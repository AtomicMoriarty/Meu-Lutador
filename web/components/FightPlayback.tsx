"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SimEvent, SimResult } from "@/lib/engine";
import { HoverButton } from "./ui/hover-button";

const ICON: Record<string, string> = {
  round_start: "🔔", round_end: "⏱️", strike: "👊", big_strike: "💥", kick: "🦵",
  miss: "💨", knockdown: "🌀", hurt: "😵", swarm: "🔥", recover: "🛟", saved_by_bell: "🛎️",
  takedown: "🤼", takedown_stuffed: "🧱", control: "🔒", ground_strikes: "🔨", sweep: "🔄",
  scramble: "🌪️", submission_attempt: "🧶", submission: "🏳️", ko: "💀", tko: "💀",
  foul: "🚫", decision: "📋",
};

const BIG = new Set(["knockdown", "hurt", "ko", "tko", "submission", "big_strike", "foul"]);
const ATTR_PT: Record<string, string> = {
  power: "poder", kicks: "chute", takedownOffense: "wrestling", takedownDefense: "defesa de queda",
  groundControl: "controle", submission: "finalização", recovery: "recuperação", volume: "volume",
};

function Row({ e, aName }: { e: SimEvent; aName: string }) {
  const mine = e.actor === aName;
  const big = BIG.has(e.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: mine ? -14 : 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 320 }}
      className="flex items-start gap-3 py-1.5"
    >
      <span className="mt-0.5 w-10 shrink-0 text-right font-mono text-xs text-mist">{e.clock}</span>
      <span className={big ? "text-xl" : "text-base"}>{ICON[e.type] ?? "•"}</span>
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
  result,
  aName,
  bName,
  playerWon,
  ctaLabel,
  onContinue,
}: {
  result: SimResult;
  aName: string;
  bName: string;
  playerWon: boolean;
  ctaLabel: string;
  onContinue: () => void;
}) {
  const events = useMemo(() => result.events, [result.events]);
  const [n, setN] = useState(0);
  const done = n >= events.length;
  const feedRef = useRef<HTMLDivElement>(null);
  const isFinish = result.method === "KO/TKO" || result.method === "Submission";

  useEffect(() => {
    if (done) return;
    const cur = events[n];
    const delay = cur && BIG.has(cur.type) ? 700 : 360;
    const t = setTimeout(() => setN((x) => x + 1), delay);
    return () => clearTimeout(t);
  }, [n, done, events]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [n]);

  let lastRound = 0;
  return (
    <div className="flex flex-col gap-4">
      <div className="card-hairline grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 text-sm">
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

      <div ref={feedRef} className="card max-h-[46dvh] overflow-y-auto p-4">
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
        {!done && (
          <div className="sticky bottom-0 flex justify-center bg-gradient-to-t from-ink-2 to-transparent pt-4">
            <button
              onClick={() => setN(events.length)}
              className="rounded-full border border-line bg-ink-3/80 px-4 py-1.5 text-xs font-bold text-mist-2 backdrop-blur transition hover:border-blood/40 hover:text-white"
            >
              Pular para o fim ⏭
            </button>
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
                      <p className="font-mono font-bold">{j.a}–{j.b}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-line p-4">
              <HoverButton className="w-full" onClick={onContinue}>{ctaLabel}</HoverButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
