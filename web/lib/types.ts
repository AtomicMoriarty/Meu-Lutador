// 12 attribute slots the player fills (combat + carisma). No weight/era framing.
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
  { attribute_name: "carisma", label: "Carisma / Mic", emoji: "🎤" },
];

export type AttributeSlot = (typeof ATTRIBUTE_SLOTS)[number];

export type FullFighter = {
  fighter_id: string;
  name: string;
  nickname: string | null;
  overall: number;
  attrs: Record<string, number>;
};

/** What a filled slot stores: which fighter it was inherited from + the value. */
export type Pick = { fighter_id: string; name: string; nickname: string | null; value: number };

/** The player's build: attribute_name -> chosen source. */
export type Build = Record<string, Pick>;
