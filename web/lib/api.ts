import type { Card, FullFighter } from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://nozthsissdwkfwtogmdu.supabase.co";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5venRoc2lzc2R3a2Z3dG9nbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODE0MTIsImV4cCI6MjA5NDY1NzQxMn0.x41P-hPbhGKH6wwA_mactKeo1y14agF5cSWKTyh4e-Q";

const PROFILE = "meu_lutador";

// RPC over PostgREST with a hard timeout + one retry, so a stalled request never
// leaves the UI spinning forever (the free-tier project can be slow to wake).
async function rpc<T>(fn: string, args: Record<string, unknown>, attempt = 0): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
        "Content-Profile": PROFILE,
        "Accept-Profile": PROFILE,
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
    return (await res.json()) as T;
  } catch (e) {
    if (attempt < 1) return rpc<T>(fn, args, attempt + 1); // one retry (cold start)
    throw e instanceof Error && e.name === "AbortError"
      ? new Error("O servidor demorou demais para responder. Tente de novo.")
      : (e as Error);
  } finally {
    clearTimeout(timer);
  }
}

/** Draw N random fighters with full attribute maps (weighted toward known/recent). */
export function randomFullFighters(n = 10): Promise<FullFighter[]> {
  return rpc<FullFighter[]>("random_full_fighters", { p_n: n });
}

/** Draw a random real UFC card (event) with its top fighters to pick from. */
export async function randomCard(): Promise<Card> {
  const rows = await rpc<Card[]>("random_card", {});
  if (!rows || rows.length === 0) throw new Error("nenhum card encontrado");
  return rows[0]!;
}
