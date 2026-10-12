import type { WaChat } from "./types";

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]"],
  [/\+?\(?\d[\d\s().-]{7,}\d/g, "[TELEFONE]"],
];

const mask = (s: string) => PATTERNS.reduce((t, [re, label]) => t.replace(re, label), s);

/**
 * Remove dados pessoais antes de enviar a conversa para análise: troca
 * nomes por papéis (Cliente/Atendente) e mascara e-mail, CPF, CNPJ e telefone.
 */
export function anonymize(chat: WaChat): WaChat {
  return {
    contato: "Cliente",
    capturadoEm: chat.capturadoEm,
    mensagens: chat.mensagens.map((m) => ({
      ...m,
      autor: m.direcao === "enviada" ? "Atendente" : "Cliente",
      texto: mask(m.texto),
    })),
  };
}
