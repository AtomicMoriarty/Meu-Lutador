// Normalize the free-text WEIGHTCLASS field to canonical division codes.
// Examples seen in the data: "Featherweight Bout", "UFC Lightweight Title Bout",
// "Women's Strawweight Bout", "Catch Weight Bout", "Open Weight Bout".

export type WeightClass =
  | "flyweight"
  | "bantamweight"
  | "featherweight"
  | "lightweight"
  | "welterweight"
  | "middleweight"
  | "light_heavyweight"
  | "heavyweight"
  | "womens_strawweight"
  | "womens_flyweight"
  | "womens_bantamweight"
  | "womens_featherweight"
  | "catchweight"
  | "open_weight"
  | "unknown";

// MVP divisions per the plan.
export const MVP_DIVISIONS: WeightClass[] = [
  "lightweight",
  "welterweight",
  "heavyweight",
];

export function normalizeWeightClass(raw: string | undefined): WeightClass {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();

  const women = s.includes("women");

  if (s.includes("catch")) return "catchweight";
  if (s.includes("open weight") || s.includes("openweight")) return "open_weight";

  if (s.includes("strawweight")) return "womens_strawweight";

  // Order matters: check the longer compound names first.
  if (s.includes("light heavyweight")) return "light_heavyweight";
  if (s.includes("heavyweight")) return "heavyweight";
  if (s.includes("welterweight")) return "welterweight";
  if (s.includes("middleweight")) return "middleweight";
  if (s.includes("featherweight")) return women ? "womens_featherweight" : "featherweight";
  if (s.includes("bantamweight")) return women ? "womens_bantamweight" : "bantamweight";
  if (s.includes("flyweight")) return women ? "womens_flyweight" : "flyweight";
  if (s.includes("lightweight")) return "lightweight";

  return "unknown";
}
