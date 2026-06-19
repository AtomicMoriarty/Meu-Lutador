// Shared normalizers for the ufcstats CSV encodings.
// These are our own implementation (the source repo is GPL — we use only its
// generated data, not its code).

/** "9 of 9" -> { landed: 9, attempted: 9 }. Blank / "---" -> nulls. */
export function parseOfPair(raw: string | undefined): {
  landed: number | null;
  attempted: number | null;
} {
  if (!raw) return { landed: null, attempted: null };
  const m = raw.trim().match(/^(\d+)\s+of\s+(\d+)$/i);
  if (!m) return { landed: null, attempted: null };
  return { landed: Number(m[1]), attempted: Number(m[2]) };
}

/** "100%" -> 100, "---" / blank -> null. */
export function parsePercent(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t === "---" || t === "--" || t === "") return null;
  const m = t.match(/^(\d+)\s*%$/);
  return m ? Number(m[1]) : null;
}

/** "1:44" -> 104 seconds. "--" / blank -> null. */
export function parseClock(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (t === "--" || t === "---" || t === "") return null;
  const m = t.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "May 16, 2026" / "Jul 13, 1978" -> "2026-05-16". Unparseable -> null. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t === "--") return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  // toISOString would shift by timezone; build the date parts directly.
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

const INCH_TO_CM = 2.54;

/** `5' 11"` -> cm. "--" / blank -> null. */
export function parseHeightToCm(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t === "--") return null;
  const m = t.match(/^(\d+)'\s*(\d+)"?$/);
  if (!m) return null;
  const inches = Number(m[1]) * 12 + Number(m[2]);
  return round1(inches * INCH_TO_CM);
}

/** `76"` -> cm. "--" / blank -> null. */
export function parseReachToCm(raw: string | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t === "--") return null;
  const m = t.match(/^(\d+(?:\.\d+)?)"?$/);
  if (!m) return null;
  return round1(Number(m[1]) * INCH_TO_CM);
}

/** "155 lbs." -> 155. "--" / blank -> null. */
export function parseWeightLbs(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d+(?:\.\d+)?)\s*lbs\.?$/i);
  return m ? Number(m[1]) : null;
}

/** Extract the hex slug from a ufcstats URL (the natural key). */
export function ufcstatsId(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.trim().match(/-details\/([0-9a-f]+)/i);
  return m ? m[1]! : null;
}

/** Trim and collapse internal whitespace; "" -> null. */
export function clean(raw: string | undefined): string | null {
  if (raw == null) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  return t === "" ? null : t;
}

/** Parse "UFC 229" / "UFC 100: ..." style names -> 229. Fight Nights -> null. */
export function parseUfcNumber(name: string | undefined): number | null {
  if (!name) return null;
  const m = name.match(/^UFC\s+(\d+)\b/i);
  return m ? Number(m[1]) : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
