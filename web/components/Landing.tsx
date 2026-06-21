"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Crosshair,
  Dna,
  Flame,
  Gavel,
  MessageSquareText,
  Shield,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { OctagonHero } from "./ui/octagon-hero";
import { Marquee } from "./ui/marquee";
import { MagneticCta } from "./ui/magnetic-cta";
import { CountUp } from "./ui/count-up";
import { BeltBadge } from "./ui/belt-badge";

const LEGENDS = [
  "Anderson Silva", "José Aldo", "Charles do Bronx", "Alex Poatan", "Amanda Nunes",
  "Jon Jones", "Khabib Nurmagomedov", "Israel Adesanya", "Conor McGregor", "Georges St-Pierre",
  "Islam Makhachev", "Max Holloway", "Deiveson Figueiredo", "Glover Teixeira", "Maurício Shogun",
  "Junior Cigano", "Fabrício Werdum", "Vitor Belfort", "Demetrious Johnson", "Kamaru Usman",
  "Dustin Poirier", "Justin Gaethje", "Ilia Topuria", "Sean O'Malley",
];

const ease = [0.22, 1, 0.36, 1] as const;

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
      initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    icon: Crosshair,
    n: "01",
    title: "Monte seu lutador",
    body: "Role o dado e herde atributos de feras reais do UFC. Poder de mão do Anderson, queixo do Holloway, wrestling do Khabib… monte o seu monstro.",
    accent: "blood" as const,
  },
  {
    icon: Flame,
    n: "02",
    title: "Enfrente a escadinha",
    body: "8 lutas, dificuldade crescente. Simulação narrada round a round com knockdowns, quedas e finalizações. Cada detalhe importa.",
    accent: "blood" as const,
  },
  {
    icon: Trophy,
    n: "03",
    title: "Conquiste o cinturão",
    body: "Main event de 5 rounds, juízes no sistema 10 a 9. Perdeu uma? Acabou. Invicto? O cinturão é seu.",
    accent: "gold" as const,
  },
];

const DIFFS = [
  { icon: Swords, value: 8, suffix: "", label: "Lutas", sub: "Escadinha até o título" },
  { icon: Gavel, value: 3, suffix: "", label: "Juízes", sub: "Sistema 10 a 9 real" },
  { icon: MessageSquareText, value: 5, suffix: "", label: "Rounds", sub: "No main event" },
  { icon: Dna, value: 11, suffix: "+", label: "Atributos", sub: "Herdados de feras" },
];

export function Landing({ onStart }: { onStart: () => void }) {
  const reduce = useReducedMotion();

  return (
    <main className="relative w-full overflow-x-hidden">
      {/* ============ HERO — GAME TITLE SCREEN ============ */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 text-center">
        <OctagonHero />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="eyebrow text-mist-2">Octógono dos Sonhos</span>
          <span className="badge-pulse inline-flex items-center gap-1.5 rounded-full border border-blood/40 bg-blood/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blood-2">
            <span className="live-dot inline-block size-1.5 rounded-full bg-blood-2" aria-hidden />
            Modo Carreira
          </span>
        </div>

        <div className="relative z-10 flex max-w-2xl flex-col items-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-smoke-2 px-4 py-1.5"
          >
            <Zap className="size-3.5 text-gold" aria-hidden />
            <span className="text-xs font-bold text-mist-2">MMA · Carreira · 8 lutas até o cinturão</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
            className="display text-balance text-[clamp(2.8rem,12vw,6rem)]"
          >
            <span className="block text-white text-glow">Herde das feras.</span>
            <span className="foil block">Conquiste o cinturão.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.25 }}
            className="mt-5 max-w-md text-pretty text-base leading-relaxed text-mist sm:text-lg"
          >
            Monte um lutador herdando cada atributo de{" "}
            <strong className="text-white">lendas reais do UFC</strong> e encare uma{" "}
            <strong className="text-gold">escadinha de 8 lutas</strong> — narrada round a round.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.4 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <MagneticCta onClick={onStart} className="glow-pulse w-[min(90vw,22rem)] text-lg">
              <Swords className="size-5" aria-hidden />
              Começar carreira
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </MagneticCta>
            <p className="text-xs text-mist">Grátis · sem cadastro · direto no navegador</p>
          </motion.div>

          {/* VS teaser card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease, delay: 0.55 }}
            className={`mt-12 w-[min(92vw,30rem)] ${reduce ? "" : "float-y"}`}
          >
            <div className="card-hairline grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)]">
              <Corner align="left" tag="Você" name="Seu Lutador" tone="blood" />
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span className="display text-3xl text-mist/60">VS</span>
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gold">
                  Main event
                </span>
              </div>
              <Corner align="right" tag="Lenda" name="Fera do UFC" tone="gold" />
            </div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center text-mist/70">
          <span className="text-[10px] uppercase tracking-[0.3em]">Descubra como funciona</span>
          <ChevronDown className={`mt-1 size-4 ${reduce ? "" : "scroll-bob"}`} aria-hidden />
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" aria-hidden />
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section className="relative mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow mb-3">Como funciona</p>
          <h2 className="display text-3xl sm:text-5xl">
            Três passos até o <span className="foil">cinturão</span>
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="card group relative h-full overflow-hidden p-6 transition-colors hover:border-blood/40">
                {/* top accent line */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${s.accent === "gold" ? "rgba(245,158,11,0.5)" : "rgba(99,102,241,0.5)"}, transparent)`,
                  }}
                  aria-hidden
                />

                <div className="flex items-center justify-between">
                  <div className={`grid size-14 place-items-center rounded-xl ring-1 ring-inset transition-transform group-hover:scale-105 ${
                    s.accent === "gold"
                      ? "bg-gold/10 text-gold ring-gold/25"
                      : "bg-blood/10 text-blood-2 ring-blood/25"
                  }`}>
                    <s.icon className="size-7" strokeWidth={1.8} aria-hidden />
                  </div>
                  <span className="display text-4xl text-line-2/40">{s.n}</span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ MARQUEE (feras reais) ============ */}
      <section className="py-10">
        <Reveal className="mb-5 text-center">
          <p className="eyebrow">Atributos herdados de feras reais</p>
        </Reveal>
        <Marquee duration={36} className="py-2">
          {LEGENDS.map((nm) => (
            <span key={nm} className="mx-3 inline-flex items-center gap-3 text-lg font-extrabold tracking-tight text-mist-2 sm:text-xl">
              {nm}
              <svg className="size-2 shrink-0 fill-blood/50" viewBox="0 0 8 8" aria-hidden><path d="M4 0l1.5 2.5L8 4l-2.5 1.5L4 8l-1.5-2.5L0 4l2.5-1.5z"/></svg>
            </span>
          ))}
        </Marquee>
        <Marquee duration={44} reverse className="py-2 opacity-60">
          {LEGENDS.slice().reverse().map((nm) => (
            <span key={nm} className="mx-3 inline-flex items-center gap-3 text-base font-bold text-mist/70 sm:text-lg">
              {nm}
              <svg className="size-2 shrink-0 fill-gold/40" viewBox="0 0 8 8" aria-hidden><path d="M4 0l1.5 2.5L8 4l-2.5 1.5L4 8l-1.5-2.5L0 4l2.5-1.5z"/></svg>
            </span>
          ))}
        </Marquee>
      </section>

      {/* ============ DIFERENCIAIS — STAT GRID ============ */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow mb-3">Por que vicia</p>
          <h2 className="display text-3xl sm:text-5xl">
            Sem atalhos.<br className="sm:hidden" /> Só o octógono.
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DIFFS.map((d, i) => (
            <Reveal key={d.label} delay={i * 0.07}>
              <div className="card group h-full overflow-hidden p-5 text-center transition-colors hover:border-gold/30">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden />
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-gold/10 text-gold ring-1 ring-inset ring-gold/25 transition-transform group-hover:scale-105">
                  <d.icon className="size-6" strokeWidth={1.8} aria-hidden />
                </div>
                <p className="display mt-4 text-4xl tabular text-white sm:text-5xl">
                  <CountUp value={d.value} suffix={d.suffix} />
                </p>
                <p className="mt-1.5 text-xs font-bold uppercase tracking-wide text-mist-2">{d.label}</p>
                <p className="mt-0.5 text-[11px] text-mist">{d.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ SOCIAL PROOF STRIP ============ */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        <Reveal>
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line/60 bg-smoke-2 p-6 text-center sm:flex-row sm:text-left">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-blood/10">
              <Shield className="size-7 text-blood-2" strokeWidth={1.8} aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Uma derrota e acabou</p>
              <p className="mt-1 text-xs leading-relaxed text-mist">
                Sem continue, sem save, sem segunda chance. Cada luta é eliminatória.
                Isso muda completamente como você monta seu lutador. Jogue com estratégia.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="px-4 pb-6">
        <Reveal>
          <div className="card-hairline relative mx-auto max-w-3xl overflow-hidden text-center">
            {/* Glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(245,158,11,0.12), transparent 70%)" }}
              aria-hidden
            />
            <div className="relative px-6 pb-8 pt-10 sm:px-12 sm:pt-14">
              <BeltBadge className="mx-auto mb-6" size={88} />
              <h2 className="display text-4xl sm:text-6xl">
                Pronto pro{" "}<span className="foil">main event?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-pretty text-mist">
                Uma derrota encerra tudo. Oito vitórias e você é lenda. Até onde você chega?
              </p>
              <div className="mt-8 flex justify-center">
                <MagneticCta tone="gold" onClick={onStart} className="glow-pulse w-[min(90vw,22rem)] text-lg">
                  <Trophy className="size-5" aria-hidden />
                  Começar minha carreira
                </MagneticCta>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ RODAPÉ ============ */}
      <footer className="border-t border-line/40 px-4 py-8 text-center">
        <p className="display text-sm tracking-wide text-mist-2">
          MEU LUTADOR <span className="text-line-2">·</span> Octógono dos Sonhos
        </p>
        <p className="mt-1.5 text-[11px] text-mist/70">
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
      <p className="mt-1.5 text-lg font-extrabold leading-tight text-white">{name}</p>
    </div>
  );
}
