/** Rótulos e nomes de equipamentos, sem dependências de servidor (usados também nas telas). */
import type { AccessGrant, EquipmentType } from "./schemas";

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  notebook: "Notebook",
  monitor: "Monitor",
  headset: "Headset",
  outros: "Outro",
};

export const ACCESS_OWNER_LABELS: Record<AccessGrant["owner"], string> = {
  rh: "RH",
  ti: "TI",
  gestor: "Gestor do projeto",
};

/** "Notebook 14\" Core i5" em vez de "Notebook Notebook 14\" Core i5". */
export function equipmentDisplayName(type: EquipmentType, model: string): string {
  const label = EQUIPMENT_TYPE_LABELS[type];
  return model.toLowerCase().startsWith(label.toLowerCase()) ? model : `${label} ${model}`;
}
