import { describe, expect, it } from "vitest";

import { redactSensitive } from "@/server/assistant/redact";

describe("mascaramento da pergunta (seção 10.2, item 1)", () => {
  it.each([
    ["Meu CPF é 123.456.789-09, está certo?", "Meu CPF é [CPF], está certo?"],
    ["cpf 12345678909", "cpf [CPF]"],
    ["CNPJ da minha empresa: 12.345.678/0001-95", "CNPJ da minha empresa: [CNPJ]"],
    ["cnpj 12345678000195", "cnpj [CNPJ]"],
    ["meu e-mail é ana.moura+rh@pessoal.example", "meu e-mail é [e-mail]"],
    ["me liga no (11) 98765-4321", "me liga no [telefone]"],
    ["whats +55 11 98765-4321", "whats [telefone]"],
    ["fixo 11 3456-7890", "fixo [telefone]"],
    ["celular 98765-4321", "celular [telefone]"],
    ["telefone 1134567890", "telefone [telefone]"],
  ])("mascara %s", (input, expected) => {
    expect(redactSensitive(input)).toBe(expected);
  });

  it.each([
    "Posso lançar R$ 1.500,00 em até 10 dias?",
    "A viagem é em 03/10/2026, às 9h30.",
    "O código do projeto é 4521.",
    "Tenho 3 tentativas no quiz de 2026?",
  ])("não mexe em números comuns: %s", (input) => {
    expect(redactSensitive(input)).toBe(input);
  });
});
