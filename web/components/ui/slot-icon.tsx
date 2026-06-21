import {
  ArrowDownUp, Brain, Crosshair, Footprints, Heart, HeartPulse,
  Link, Lock, Mic, Shield, ShieldCheck, Zap,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  crosshair: Crosshair,
  zap: Zap,
  footprints: Footprints,
  "heart-pulse": HeartPulse,
  shield: Shield,
  heart: Heart,
  "arrow-down-up": ArrowDownUp,
  "shield-check": ShieldCheck,
  lock: Lock,
  link: Link,
  brain: Brain,
  mic: Mic,
};

export function SlotIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name];
  if (!Icon) return null;
  return <Icon className={className} strokeWidth={1.8} />;
}
