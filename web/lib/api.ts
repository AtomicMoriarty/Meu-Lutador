import type { FullFighter, SlotOption } from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://nozthsissdwkfwtogmdu.supabase.co";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5venRoc2lzc2R3a2Z3dG9nbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODE0MTIsImV4cCI6MjA5NDY1NzQxMn0.x41P-hPbhGKH6wwA_mactKeo1y14agF5cSWKTyh4e-Q";

// RPCs live in the meu_lutador schema → PostgREST needs the schema profile header.
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      "Content-Profile": "meu_lutador",
      "Accept-Profile": "meu_lutador",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      if (b?.message) msg = b.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/** 10 random fighters (across the whole roster) who have the given attribute. */
export function randomAttributeOptions(attribute: string, n = 10): Promise<SlotOption[]> {
  return rpc<SlotOption[]>("random_attribute_options", { p_attribute: attribute, p_n: n });
}

/** N random fighters with their full attribute map — used to build ladder opponents. */
export function randomFullFighters(n = 24): Promise<FullFighter[]> {
  return rpc<FullFighter[]>("random_full_fighters", { p_n: n });
}
