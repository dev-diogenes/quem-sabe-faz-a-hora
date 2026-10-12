import type { ConversationAnalysis } from "./analysis";
import type { Conversa } from "./types";

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "conversa";

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function toJSON(chat: Conversa, analise?: ConversationAnalysis): string {
  return JSON.stringify({ ...chat, analise }, null, 2);
}

export function toCSV(chat: Conversa): string {
  const header = ["horario", "autor", "email", "direcao", "texto"].join(",");
  const rows = chat.mensagens.map((m) => [m.horario, m.autor, m.email ?? "", m.direcao, m.texto].map(csvCell).join(","));
  // BOM para o Excel abrir com acentos corretos.
  return "﻿" + [header, ...rows].join("\r\n");
}

export function toTXT(chat: Conversa): string {
  const cabecalho = chat.assunto ? `Assunto: ${chat.assunto}\n\n` : "";
  return cabecalho + chat.mensagens.map((m) => `[${m.horario}] ${m.autor}: ${m.texto}`).join("\n\n");
}

export function download(chat: Conversa, format: "json" | "csv" | "txt", analise?: ConversationAnalysis) {
  const body = format === "json" ? toJSON(chat, analise) : format === "csv" ? toCSV(chat) : toTXT(chat);
  const type = { json: "application/json", csv: "text/csv", txt: "text/plain" }[format];
  const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chat.canal}-${slug(chat.contato)}-${chat.capturadoEm.slice(0, 10)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
