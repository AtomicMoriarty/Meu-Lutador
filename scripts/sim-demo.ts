// Local sanity check for the pure engine (no DB). Runs a striker vs a grappler
// across many seeds and prints the outcome distribution + one sample log.

import { simulate, makeFighter } from "../src/engine.js";

const striker = makeFighter("Pé-de-Pano (striker)", {
  power: { value: 92, source: "Francis Ngannou" },
  volume: { value: 80, source: "Max Holloway" },
  kicks: { value: 85, source: "Edson Barboza" },
  chin: { value: 78, source: "Justin Gaethje" },
  cardio: { value: 70, source: "Max Holloway" },
  recovery: { value: 65, source: "Dustin Poirier" },
  takedownOffense: { value: 30, source: "Conor McGregor" },
  takedownDefense: { value: 82, source: "Israel Adesanya" },
  groundControl: { value: 35, source: "Anderson Silva" },
  submission: { value: 30, source: "Conor McGregor" },
  fightIq: { value: 80, source: "Israel Adesanya" },
});

const grappler = makeFighter("Anaconda (grappler)", {
  power: { value: 55, source: "Demian Maia" },
  volume: { value: 55, source: "Khabib Nurmagomedov" },
  kicks: { value: 35, source: "Demian Maia" },
  chin: { value: 80, source: "Khabib Nurmagomedov" },
  cardio: { value: 90, source: "Khabib Nurmagomedov" },
  recovery: { value: 75, source: "Charles Oliveira" },
  takedownOffense: { value: 95, source: "Khabib Nurmagomedov" },
  takedownDefense: { value: 70, source: "Georges St-Pierre" },
  groundControl: { value: 93, source: "Khabib Nurmagomedov" },
  submission: { value: 90, source: "Charles Oliveira" },
  fightIq: { value: 78, source: "Georges St-Pierre" },
});

const N = 2000;
const tally: Record<string, number> = {};
for (let i = 0; i < N; i++) {
  const r = simulate(striker, grappler, { rounds: 3, seed: i + 1 });
  const key = `${r.winner ?? "Draw"} by ${r.method}`;
  tally[key] = (tally[key] ?? 0) + 1;
}

console.log(`=== ${N} sims: striker vs grappler ===`);
for (const [k, c] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${(100 * c / N).toFixed(1)}%  ${k}`);
}

console.log("\n=== sample fight log (seed 7) ===");
const sample = simulate(striker, grappler, { rounds: 3, seed: 7 });
for (const e of sample.events) {
  const who = e.actor ? `${e.actor}` : "";
  const via = e.source ? `  [${e.attribute} de ${e.source}]` : "";
  console.log(`  R${e.round} ${e.clock.padStart(4)} ${e.type.padEnd(18)} ${who}${e.detail ? " — " + e.detail : ""}${via}`);
}
console.log(`\nRESULT: ${sample.winner ?? "Draw"} via ${sample.method} R${sample.round} ${sample.clock} (cards ${sample.scorecards.a}-${sample.scorecards.b})`);
