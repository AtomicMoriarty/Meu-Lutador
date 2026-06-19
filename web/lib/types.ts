export type AttributeSlot = { attribute_name: string; label: string };

export type DrawResponse = {
  weight_class: string;
  window_months: number;
  pool_size: number;
  anchor_event: {
    id: string;
    name: string;
    ufc_number: number | null;
    event_date: string | null;
    location: string | null;
  };
  attribute_slots: AttributeSlot[];
};

export type Confidence = "alto" | "medio" | "manual";

export type SlotOption = {
  fighter_id: string;
  name: string;
  nickname: string | null;
  value: number;
  confidence: Confidence;
};

export type SlotOptionsResponse = {
  weight_class: string;
  attribute: string;
  count: number;
  options: SlotOption[];
};

export type SimEvent = {
  round: number;
  clock: string;
  type: string;
  actor?: string;
  target?: string;
  attribute?: string;
  source?: string;
  detail?: string;
};

export type SimResult = {
  winner: string | null;
  loser: string | null;
  method: "KO/TKO" | "Submission" | "Decision" | "Draw";
  round: number;
  clock: string;
  rounds: number;
  scorecards: { a: number; b: number };
  events: SimEvent[];
  seed: number;
};

export type SimulateResponse = {
  result: SimResult;
  narrative: string | null;
  fighters: unknown;
};

export type BuiltFighter = { name: string; picks: Record<string, string> };

export const WEIGHT_CLASSES: { code: string; label: string }[] = [
  { code: "lightweight", label: "Peso-leve" },
  { code: "welterweight", label: "Peso-meio-médio" },
  { code: "heavyweight", label: "Peso-pesado" },
];

export const WC_LABEL: Record<string, string> = Object.fromEntries(
  WEIGHT_CLASSES.map((w) => [w.code, w.label]),
);
