import { describe, expect, it } from "vitest";

import { fakeCnpj, fakeCpf, isValidCnpj, isValidCpf } from "@/domain/samples";
import { revealSensitive, submitForm } from "@/domain/services/onboarding";
import { validateForm } from "@/domain/forms";
import { fichaPj } from "@/config/forms/ficha-pj";
import { maskCnpj, maskCpf, maskEmailShort, maskGeneric } from "@/lib/format";

import { auditOf, createAna, createTestDomain, formValuesFor, RH } from "./helpers";

describe("mascaramento de dados sensíveis", () => {
  it("mascara CPF, CNPJ, e-mail e valores genéricos", () => {
    expect(maskCpf("123.456.789-09")).toBe("•••.•••.789-09");
    expect(maskCnpj("12.345.678/0001-95")).toBe("••.•••.•••/0001-95");
    expect(maskEmailShort("ana.moura@pessoal.example")).toBe("ana…@…");
    expect(maskGeneric("1234-5")).toBe("••••-5");
  });

  it("revelar um dado sensível registra o acesso na auditoria", async () => {
    const { ctx } = await createTestDomain();
    const { caseId, personId } = await createAna(ctx);
    const values = await formValuesFor(ctx, personId);
    await submitForm(ctx, caseId, values, personId);
    const cpf = await revealSensitive(ctx, caseId, "cpf", RH);
    expect(cpf).toBe(values.cpf);
    const [entry] = await auditOf(ctx, "sensitive.revealed", caseId);
    expect(entry?.actorId).toBe(RH);
    expect(entry?.payload).toMatchObject({ field: "cpf", label: "CPF" });
  });

  it("não revela campos que não são sensíveis", async () => {
    const { ctx } = await createTestDomain();
    const { caseId, personId } = await createAna(ctx);
    await submitForm(ctx, caseId, await formValuesFor(ctx, personId), personId);
    await expect(revealSensitive(ctx, caseId, "cidade", RH)).rejects.toThrow("Campo não encontrado");
  });
});

describe("dados fictícios", () => {
  it("CPF e CNPJ de exemplo têm formato certo e dígito verificador inválido", () => {
    for (const name of ["Ana Beatriz Moura", "Bruno Almeida", "Lucas Ferraz", "Juliana Prado", "Marina Takeda", "Carolina Reis", "Rafael Nogueira"]) {
      expect(fakeCpf(name)).toMatch(/^\d{11}$/);
      expect(isValidCpf(fakeCpf(name))).toBe(false);
      expect(fakeCnpj(name)).toMatch(/^\d{14}$/);
      expect(isValidCnpj(fakeCnpj(name))).toBe(false);
    }
    // O validador reconhece documentos válidos (controle).
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("a ficha de exemplo passa na validação do schema", async () => {
    const { ctx } = await createTestDomain();
    const { personId } = await createAna(ctx);
    expect(validateForm(fichaPj, await formValuesFor(ctx, personId))).toEqual({});
  });

  it("a validação aponta campo obrigatório e formato", () => {
    const errors = validateForm(fichaPj, { cpf: "123", aceitePrivacidade: false });
    expect(errors.cpf).toBe("O CPF tem 11 números.");
    expect(errors.nomeCompleto).toBe("Campo obrigatório.");
    expect(errors.aceitePrivacidade).toBe("Marque para continuar.");
    // Dados bancários só são exigidos quando a escolha não é PIX.
    expect(errors.pjBanco).toBeUndefined();
  });
});
