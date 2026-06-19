// Meu-Lutador game API (Phase 3). One routed Edge Function:
//   GET  /ml-api/draw           ?weight_class=            -> random division + era
//   GET  /ml-api/slot-options   ?weight_class&anchor_event_id&attribute -> pickable fighters
//   POST /ml-api/simulate       { fighterA, fighterB, rounds?, seed? } -> log (+narrative)
//
// Reads the meu_lutador schema with the service role. Narrative is optional and
// only runs if ANTHROPIC_API_KEY is set as a function secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { simulate, makeFighter, ATTR_KEYS, ATTR_NAME_TO_KEY, type AttrKey } from "./engine.ts";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { db: { schema: "meu_lutador" }, auth: { persistSession: false } },
);

// attribute_name <-> engine key, plus PT-BR labels for the 11 combat slots.
const KEY_TO_ATTR_NAME = Object.fromEntries(
  Object.entries(ATTR_NAME_TO_KEY).map(([n, k]) => [k, n]),
) as Record<AttrKey, string>;

const ATTR_LABELS: Record<string, string> = {
  poder_de_mao: "Poder de mão",
  volume_velocidade: "Volume / Velocidade",
  chute_perna: "Chute / Perna",
  cardio: "Cardio",
  queixo: "Queixo",
  recuperacao: "Recuperação",
  wrestling_quedas: "Wrestling / Quedas",
  defesa_queda: "Defesa de queda",
  controle_chao: "Controle no chão",
  finalizacao: "Finalização",
  qi_luta: "QI de luta",
};
const ATTRIBUTE_SLOTS = ATTR_KEYS.map((k) => ({
  attribute_name: KEY_TO_ATTR_NAME[k],
  label: ATTR_LABELS[KEY_TO_ATTR_NAME[k]],
}));

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------------------------------------------------------------------------

async function handleDraw(u: URL): Promise<Response> {
  const wc = u.searchParams.get("weight_class");
  let q = db.from("division_snapshot").select("weight_class, anchor_event_id, window_months, pool_size, anchor_date");
  if (wc) q = q.eq("weight_class", wc);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 500);
  if (!data || data.length === 0) return json({ error: "no snapshots" }, 404);

  const pick = data[Math.floor(Math.random() * data.length)];
  const { data: ev } = await db.from("events").select("name, ufc_number, event_date, location").eq("id", pick.anchor_event_id).single();

  return json({
    weight_class: pick.weight_class,
    window_months: pick.window_months,
    pool_size: pick.pool_size,
    anchor_event: { id: pick.anchor_event_id, ...ev },
    attribute_slots: ATTRIBUTE_SLOTS,
  });
}

async function handleSlotOptions(u: URL): Promise<Response> {
  const wc = u.searchParams.get("weight_class");
  const anchor = u.searchParams.get("anchor_event_id");
  const attribute = u.searchParams.get("attribute");
  if (!wc || !anchor || !attribute) return json({ error: "weight_class, anchor_event_id, attribute required" }, 400);

  const { data: snap, error: se } = await db
    .from("division_snapshot")
    .select("eligible_fighter_ids")
    .eq("weight_class", wc).eq("anchor_event_id", anchor).maybeSingle();
  if (se) return json({ error: se.message }, 500);
  if (!snap) return json({ error: "snapshot not found" }, 404);

  const ids: string[] = snap.eligible_fighter_ids;
  const { data, error } = await db
    .from("attribute_scores")
    .select("fighter_id, value_0_100, confidence, fighters(name, nickname)")
    .in("fighter_id", ids)
    .eq("attribute_name", attribute)
    .order("value_0_100", { ascending: false });
  if (error) return json({ error: error.message }, 500);

  const options = (data ?? []).map((r: any) => ({
    fighter_id: r.fighter_id,
    name: r.fighters?.name,
    nickname: r.fighters?.nickname,
    value: Number(r.value_0_100),
    confidence: r.confidence,
  }));
  return json({ weight_class: wc, attribute, count: options.length, options });
}

type BuiltFighter = { name: string; picks: Record<string, string> }; // attribute_name -> source fighter_id

async function handleSimulate(req: Request): Promise<Response> {
  let body: { fighterA: BuiltFighter; fighterB: BuiltFighter; rounds?: 3 | 5; seed?: number };
  try { body = await req.json(); } catch { return json({ error: "invalid JSON body" }, 400); }
  const { fighterA, fighterB } = body ?? {};
  if (!fighterA?.picks || !fighterB?.picks) return json({ error: "fighterA.picks and fighterB.picks required" }, 400);

  const sourceIds = [...new Set([...Object.values(fighterA.picks), ...Object.values(fighterB.picks)])];
  if (sourceIds.length === 0) return json({ error: "no picks provided" }, 400);

  const { data: scores, error } = await db
    .from("attribute_scores")
    .select("fighter_id, attribute_name, value_0_100")
    .in("fighter_id", sourceIds);
  if (error) return json({ error: error.message }, 500);
  const { data: fighters } = await db.from("fighters").select("id, name").in("id", sourceIds);
  const nameById = new Map((fighters ?? []).map((f: any) => [f.id, f.name]));

  const valueOf = new Map<string, number>(); // `${fid}|${attr}` -> value
  for (const s of scores ?? []) valueOf.set(`${s.fighter_id}|${s.attribute_name}`, Number(s.value_0_100));

  const build = (bf: BuiltFighter) => {
    const attrs: Partial<Record<AttrKey, { value: number; source?: string }>> = {};
    for (const k of ATTR_KEYS) {
      const attrName = KEY_TO_ATTR_NAME[k];
      const sid = bf.picks[attrName];
      if (!sid) continue;
      const val = valueOf.get(`${sid}|${attrName}`);
      if (val == null) continue;
      attrs[k] = { value: val, source: nameById.get(sid) };
    }
    return makeFighter(bf.name || "Lutador", attrs);
  };

  const A = build(fighterA);
  const B = build(fighterB);
  const result = simulate(A, B, { rounds: body.rounds ?? 3, seed: body.seed });

  const narrative = await maybeNarrate(A.name, B.name, result);
  return json({ result, narrative, fighters: { a: A, b: B } });
}

async function maybeNarrate(aName: string, bName: string, result: any): Promise<string | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;
  const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
  const log = result.events
    .filter((e: any) => e.actor || e.type === "decision")
    .map((e: any) => `R${e.round} ${e.clock} ${e.type} ${e.actor ?? ""} ${e.detail ?? ""}${e.source ? ` [${e.attribute} de ${e.source}]` : ""}`)
    .join("\n");
  const prompt =
    `Você é um narrador de MMA em português do Brasil. Narre esta luta entre ` +
    `${aName} e ${bName} round a round, de forma empolgante e fiel ao log. ` +
    `Quando um atributo decisivo aparecer, cite de qual lutador-base ele veio ` +
    `(ex.: "a queda nasceu do wrestling de X"). Termine com o resultado: ` +
    `${result.winner ?? "empate"} por ${result.method} no round ${result.round} (${result.clock}).\n\nLOG:\n${log}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const u = new URL(req.url);
  const route = u.pathname.split("/").filter(Boolean).pop(); // last segment
  try {
    if (req.method === "GET" && route === "draw") return await handleDraw(u);
    if (req.method === "GET" && route === "slot-options") return await handleSlotOptions(u);
    if (req.method === "POST" && route === "simulate") return await handleSimulate(req);
    return json({ error: "not found", routes: ["GET /draw", "GET /slot-options", "POST /simulate"] }, 404);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
