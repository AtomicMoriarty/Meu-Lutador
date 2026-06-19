import type {
  BuiltFighter,
  DrawResponse,
  SimulateResponse,
  SlotOptionsResponse,
} from "./types";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://nozthsissdwkfwtogmdu.supabase.co";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5venRoc2lzc2R3a2Z3dG9nbWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODE0MTIsImV4cCI6MjA5NDY1NzQxMn0.x41P-hPbhGKH6wwA_mactKeo1y14agF5cSWKTyh4e-Q";

const BASE = `${SUPABASE_URL}/functions/v1/ml-api`;
const authHeaders = {
  Authorization: `Bearer ${ANON_KEY}`,
  apikey: ANON_KEY,
  "Content-Type": "application/json",
};

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export function drawFight(weightClass?: string): Promise<DrawResponse> {
  const q = weightClass ? `?weight_class=${encodeURIComponent(weightClass)}` : "";
  return fetch(`${BASE}/draw${q}`, { headers: authHeaders }).then((r) =>
    asJson<DrawResponse>(r),
  );
}

export function getSlotOptions(
  weightClass: string,
  anchorEventId: string,
  attribute: string,
): Promise<SlotOptionsResponse> {
  const q = new URLSearchParams({
    weight_class: weightClass,
    anchor_event_id: anchorEventId,
    attribute,
  });
  return fetch(`${BASE}/slot-options?${q}`, { headers: authHeaders }).then((r) =>
    asJson<SlotOptionsResponse>(r),
  );
}

export function simulateFight(payload: {
  fighterA: BuiltFighter;
  fighterB: BuiltFighter;
  rounds?: 3 | 5;
  seed?: number;
}): Promise<SimulateResponse> {
  return fetch(`${BASE}/simulate`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  }).then((r) => asJson<SimulateResponse>(r));
}
