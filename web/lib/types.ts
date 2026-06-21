// 12 attribute slots the player fills (combat + carisma). No weight/era framing.
export const ATTRIBUTE_SLOTS: { attribute_name: string; label: string; icon: string }[] = [
  { attribute_name: "poder_de_mao", label: "Poder de mão", icon: "crosshair" },
  { attribute_name: "volume_velocidade", label: "Volume / Velocidade", icon: "zap" },
  { attribute_name: "chute_perna", label: "Chute / Perna", icon: "footprints" },
  { attribute_name: "cardio", label: "Cardio", icon: "heart-pulse" },
  { attribute_name: "queixo", label: "Queixo", icon: "shield" },
  { attribute_name: "recuperacao", label: "Recuperação", icon: "heart" },
  { attribute_name: "wrestling_quedas", label: "Wrestling / Quedas", icon: "arrow-down-up" },
  { attribute_name: "defesa_queda", label: "Defesa de queda", icon: "shield-check" },
  { attribute_name: "controle_chao", label: "Controle no chão", icon: "lock" },
  { attribute_name: "finalizacao", label: "Finalização", icon: "link" },
  { attribute_name: "qi_luta", label: "QI de luta", icon: "brain" },
  { attribute_name: "carisma", label: "Carisma / Mic", icon: "mic" },
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
