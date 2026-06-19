// Static attribute slots (combat attributes the player builds). No weight/era.
export const ATTRIBUTE_SLOTS: { attribute_name: string; label: string; emoji: string }[] = [
  { attribute_name: "poder_de_mao", label: "Poder de mão", emoji: "🥊" },
  { attribute_name: "volume_velocidade", label: "Volume / Velocidade", emoji: "⚡" },
  { attribute_name: "chute_perna", label: "Chute / Perna", emoji: "🦵" },
  { attribute_name: "cardio", label: "Cardio", emoji: "🫁" },
  { attribute_name: "queixo", label: "Queixo", emoji: "🦷" },
  { attribute_name: "recuperacao", label: "Recuperação", emoji: "❤️‍🩹" },
  { attribute_name: "wrestling_quedas", label: "Wrestling / Quedas", emoji: "🤼" },
  { attribute_name: "defesa_queda", label: "Defesa de queda", emoji: "🛡️" },
  { attribute_name: "controle_chao", label: "Controle no chão", emoji: "🔒" },
  { attribute_name: "finalizacao", label: "Finalização", emoji: "🧶" },
  { attribute_name: "qi_luta", label: "QI de luta", emoji: "🧠" },
];

export type SlotOption = {
  fighter_id: string;
  name: string;
  nickname: string | null;
  value: number;
};

export type FullFighter = {
  fighter_id: string;
  name: string;
  nickname: string | null;
  overall: number;
  attrs: Record<string, number>;
};

// A built fighter: per attribute_name, the chosen source option.
export type Build = Record<string, SlotOption>;
