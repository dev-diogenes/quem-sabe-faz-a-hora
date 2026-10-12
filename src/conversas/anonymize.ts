import type { Conversa } from "./types";

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]"],
  [/\+?\(?\d[\d\s().-]{7,}\d/g, "[TELEFONE]"],
];

export const mask = (s: string) => PATTERNS.reduce((t, [re, label]) => t.replace(re, label), s);

/**
 * Remove dados pessoais do conteúdo: troca nomes por papéis
 * (Cliente/Atendente) e mascara e-mail, CPF, CNPJ e telefone. O
 * `identificador` é mantido: ele só serve para localizar o contato no CRM
 * e nunca é enviado ao Claude.
 */
export function anonymize(c: Conversa): Conversa {
  return {
    ...c,
    contato: "Cliente",
    assunto: c.assunto ? mask(c.assunto) : undefined,
    mensagens: c.mensagens.map((m) => ({
      autor: m.direcao === "enviada" ? "Atendente" : "Cliente",
      direcao: m.direcao,
      horario: m.horario,
      texto: mask(m.texto),
    })),
  };
}
