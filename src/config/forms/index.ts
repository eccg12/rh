import type { FieldDef, FormSchema, Regime } from "@/domain/schemas";

import { fichaClt } from "./ficha-clt";
import { fichaPj } from "./ficha-pj";

export const forms: FormSchema[] = [fichaPj, fichaClt];

export function formForRegime(regime: Regime): FormSchema {
  return regime === "CLT" ? fichaClt : fichaPj;
}

export function formById(id: string): FormSchema | undefined {
  return forms.find((f) => f.id === id);
}

export function allFields(form: FormSchema): FieldDef[] {
  return form.sections.flatMap((s) => s.fields);
}
