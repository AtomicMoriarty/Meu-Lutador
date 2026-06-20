"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  Dna,
  Dumbbell,
  Gavel,
  MessageSquareText,
  Swords,
  Trophy,
} from "lucide-react";
import { OctagonHero } from "./ui/octagon-hero";
import { Marquee } from "./ui/marquee";
import { MagneticCta } from "./ui/magnetic-cta";
import { CountUp } from "./ui/count-up";
import { BeltBadge } from "./ui/belt-badge";

/** Curated roster of real UFC legends for the broadcast crawl (static — no new endpoint). */
const LEGENDS = [
  "Anderson Silva", "José Aldo", "Charles do Bronx", "Alex Poatan", "Amanda Nunes",
  "Jon Jones", "Khabib Nurmagomedov", "Israel Adesanya", "Conor McGregor", "Georges St-Pierre",
  "Islam Makhachev", "Max Holloway", "Deiveson Figueiredo", "Glover Teixeira", "Maurício Shogun",
  "Junior Cigano", "Fabrício Werdum", "Vitor Belfort", "Demetrious Johnson", "Kamaru Usman",
  "Dustin Poirier", "Justin Gaethje", "Ilia Topuria", "Sean O'Malley",
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    icon: Dumbbell,
    n: "01",
    title: "Monte seu lutador",
    body: "Cada um dos 11 atributos é sorteado entre 10 feras reais do UFC. Escolha de quem herdar poder, queixo, cardio, finalização… e forme um monstro.",
  },
  {
    icon: Swords,
    n: "02",
    title: "Lute a escadinha",
    body: "8 lutas, dificuldade subindo degrau a degrau. Simulação narrada round a round, com knockdowns, quedas e finalizações em tempo real.",
  },
  {
    icon: Trophy,
    n: "03",
    title: "Seja campeão",
    body: "Sobreviva ao co-main e ao main event (5 rounds, juízes 10–9). Perdeu uma? Acabou. Fechou 8–0? O cinturão é seu.",
  },
];

const DIFFS = [
  { icon: Swords, value: 8, suffix: "", label: "lutas em escadinha", sub: "co-main + main event" },
  { icon: Gavel, value: 10, suffix: "–9", label: "sistema dos juízes", sub: "10–8 em round dominado" },
  { icon: MessageSquareText, value: 5, suffix: " rounds", label: "narração com suspense", sub: "round a round, ao vivo" },
  { icon: Dna, value: 11, suffix: "", label: "atributos herdados", sub: "de feras reais do UFC" },
];

export function Landing({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();

  return (
    <main className="relative w-full overflow-x-hidden pb-16">
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pt-6 text-center">
        <OctagonHero />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4">
          <span className="eyebrow">Octógono dos Sonhos</span>
          <span className="badge-pulse inline-flex items-center gap-1.5 rounded-full border border-blood/40 bg-blood/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blood-2">
            <span className="live-dot inline-block size-1.5 rounded-full bg-blood-2" aria-hidden />
            Modo Carreira
          </span>
        </div>

        <div className="relative z-10 flex max-w-2xl flex-col items-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="eyebrow mb-4"
          >
            MMA • Carreira • 8 lutas até o cinturão
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="display text-balance text-[clamp(2.6rem,11vw,5.5rem)]"
          >
            <span className="block text-white text-glow">Herde das feras.</span>
            <span className="foil block">Conquiste o cinturão.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            className="mt-5 max-w-md text-pretty text-base leading-relaxed text-mist-2 sm:text-lg"
          >
            Monte um lutador de MMA herdando cada atributo de <strong className="text-white">lendas reais do UFC</strong> e
            encare uma <strong className="text-gold">escadinha de 8 lutas</strong> — simulada e narrada round a round.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <MagneticCta onClick={onStart} className="w-[min(88vw,22rem)]">
              <Swords className="size-5" aria-hidden />
              Começar carreira
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </MagneticCta>
            <p className="text-xs text-mist">Grátis • sem cadastro • joga no navegador</p>
          </motion.div>

          {/* VS teaser card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
            className={`mt-10 w-[min(92vw,30rem)] ${reduce ? "" : "float-y"}`}
          >
            <div className="card-hairline grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
              <Corner align="left" tag="Você" name="Seu Lutador" tone="blood" />
              <div className="flex flex-col items-center px-1">
                <span className="display text-2xl text-mist">VS</span>
                <span className="mt-1 rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                  Main event
                </span>
              </div>
              <Corner align="right" tag="Lenda" name="Fera do UFC" tone="gold" />
            </div>
          </motion.div>
        </div>

        {/* scroll hint */}
        <div className="absolute inset-x-0 bottom-5 z-10 flex flex-col items-center text-mist">
          <span className="text-[10px] uppercase tracking-[0.3em]">Role para ver</span>
          <ChevronDown className={`mt-1 size-4 ${reduce ? "" : "scroll-bob"}`} aria-hidden />
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <Reveal className="mb-10 text-center">
          <p className="eyebrow mb-3">Como funciona</p>
          <h2 className="display text-3xl sm:text-4xl">
            Três passos até o <span className="foil">cinturão</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="card group h-full p-5 transition-colors hover:border-blood/40">
                <div className="flex items-center justify-between">
                  <div className="grid size-12 place-items-center rounded-xl bg-blood/12 text-blood-2 ring-1 ring-inset ring-blood/25 transition-transform group-hover:scale-105">
                    <s.icon className="size-6" aria-hidden />
                  </div>
                  <span className="display text-3xl text-line-2">{s.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mist">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ MARQUEE (feras reais) ============ */}
      <section className="py-6">
        <Reveal className="mb-4 text-center">
          <p className="eyebrow">Atributos herdados de feras reais</p>
        </Reveal>
        <Marquee duration={38} className="py-2">
          {LEGENDS.map((nm) => (
            <span key={nm} className="mx-3 inline-flex items-center gap-3 text-lg font-extrabold text-mist-2 sm:text-xl">
              {nm}
              <span className="text-blood/60" aria-hidden>✦</span>
            </span>
          ))}
        </Marquee>
        <Marquee duration={46} reverse className="py-2 opacity-70">
          {LEGENDS.slice().reverse().map((nm) => (
            <span key={nm} className="mx-3 inline-flex items-center gap-3 text-base font-bold text-mist sm:text-lg">
              {nm}
              <span className="text-gold/50" aria-hidden>✦</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* ============ DIFERENCIAIS ============ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <Reveal className="mb-10 text-center">
          <p className="eyebrow mb-3">Por que vicia</p>
          <h2 className="display text-3xl sm:text-4xl">Sem atalhos. Só o octógono.</h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIFFS.map((d, i) => (
            <Reveal key={d.label} delay={i * 0.06}>
              <div className="card h-full p-4 text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-lg bg-gold/12 text-gold ring-1 ring-inset ring-gold/25">
                  <d.icon className="size-5" aria-hidden />
                </div>
                <p className="mt-3 display text-3xl tabular text-white sm:text-4xl">
                  <CountUp value={d.value} suffix={d.suffix} />
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-mist-2">{d.label}</p>
                <p className="mt-0.5 text-[11px] text-mist">{d.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="px-4 pb-10">
        <Reveal>
          <div className="card-hairline relative mx-auto max-w-3xl overflow-hidden p-8 text-center sm:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(245,181,63,0.12), transparent 70%)" }}
              aria-hidden
            />
            <div className="relative">
              <BeltBadge className="mx-auto mb-5" size={76} />
              <h2 className="display text-3xl sm:text-5xl">
                Pronto pro <span className="foil">main event?</span>
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-mist-2">
                Uma derrota encerra a campanha. Oito vitórias te fazem lenda. Quanto longe você chega?
              </p>
              <div className="mt-7 flex justify-center">
                <MagneticCta tone="gold" onClick={onStart} className="w-[min(88vw,22rem)]">
                  <Trophy className="size-5" aria-hidden />
                  Começar minha carreira
                </MagneticCta>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ RODAPÉ ============ */}
      <footer className="border-t border-line/60 px-4 py-6 text-center">
        <p className="display text-sm tracking-wide text-mist-2">
          MEU LUTADOR <span className="text-line-2">·</span> Octógono dos Sonhos
        </p>
        <p className="mt-1 text-[11px] text-mist">
          Jogo de simulação para fãs. Nomes de atletas usados de forma referencial. Sem afiliação com o UFC.
        </p>
      </footer>
    </main>
  );
}

function Corner({
  align,
  tag,
  name,
  tone,
}: {
  align: "left" | "right";
  tag: string;
  name: string;
  tone: "blood" | "gold";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <span
        className={`inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
          tone === "blood" ? "bg-blood/15 text-blood-2" : "bg-gold/15 text-gold"
        }`}
      >
        {tag}
      </span>
      <p className="mt-1.5 text-base font-extrabold leading-tight text-white">{name}</p>
    </div>
  );
}
