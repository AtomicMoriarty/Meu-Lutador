// Local sanity check for the engine (no DB). Outcome distribution + sample log.
import { simulate, makeFighter } from "../src/engine.js";

const striker = makeFighter("Striker", {
  power: { value: 92, source: "Francis Ngannou" }, volume: { value: 80, source: "Max Holloway" },
  kicks: { value: 85, source: "Edson Barboza" }, chin: { value: 78, source: "Justin Gaethje" },
  cardio: { value: 70, source: "Max Holloway" }, recovery: { value: 65, source: "Dustin Poirier" },
  takedownOffense: { value: 30 }, takedownDefense: { value: 82, source: "Israel Adesanya" },
  groundControl: { value: 35 }, submission: { value: 30 }, fightIq: { value: 80, source: "Israel Adesanya" },
});
const grappler = makeFighter("Grappler", {
  power: { value: 55 }, volume: { value: 55, source: "Khabib Nurmagomedov" }, kicks: { value: 35 },
  chin: { value: 80, source: "Khabib Nurmagomedov" }, cardio: { value: 90, source: "Khabib Nurmagomedov" },
  recovery: { value: 75, source: "Charles Oliveira" }, takedownOffense: { value: 95, source: "Khabib Nurmagomedov" },
  takedownDefense: { value: 70, source: "Georges St-Pierre" }, groundControl: { value: 93, source: "Khabib Nurmagomedov" },
  submission: { value: 90, source: "Charles Oliveira" }, fightIq: { value: 78 },
});

const N = 2000;
const tally: Record<string, number> = {};
for (let i = 0; i < N; i++) {
  const r = simulate(striker, grappler, { rounds: 3, seed: i + 1 });
  const key = `${r.winner ?? "Empate"} — ${r.decision}`;
  tally[key] = (tally[key] ?? 0) + 1;
}
console.log(`=== ${N} sims (3 rounds) ===`);
for (const [k, c] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${(100 * c / N).toFixed(1)}%  ${k}`);

console.log("\n=== sample 5-round fight (seed 7) ===");
const s = simulate(striker, grappler, { rounds: 5, seed: 7 });
for (const e of s.events) {
  const via = e.source ? `  [${e.attribute} de ${e.source}]` : "";
  console.log(`  R${e.round} ${e.clock.padStart(4)} ${e.type.padEnd(18)} ${e.actor ?? ""}${e.detail ? " — " + e.detail : ""}${via}`);
}
console.log(`\nRESULT: ${s.winner ?? "Empate"} · ${s.method} · ${s.decision} · R${s.round} ${s.clock}`);
console.log("Cartões:", s.judges.map((j) => `${j.a}-${j.b}`).join(" / "));
