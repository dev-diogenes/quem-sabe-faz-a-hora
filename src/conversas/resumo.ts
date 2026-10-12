import type { AnalysisRecord } from "../lib/storage";
import { CANAL_NOME } from "./types";

const NIVEL: Record<string, string> = { nenhuma: "nenhuma", baixa: "baixa", media: "média", alta: "alta" };

/** Texto legível da análise, para notas e atividades no CRM. */
export function resumoTexto(r: AnalysisRecord, contatoNome?: string): string {
  const a = r.analise;
  const c = r.conversa;
  const linhas = [
    `[Faz a Hora] Análise de conversa por ${CANAL_NOME[c.canal]}`,
    `Contato: ${contatoNome ?? c.contato}${c.assunto ? ` · Assunto: ${c.assunto}` : ""} · ${c.mensagens.length} mensagens`,
    `Sentimento: ${a.sentimento.geral} (${a.sentimento.score.toFixed(2)}) · Satisfação: ${a.satisfacao.nota}/5`,
    `Risco de cancelamento: ${NIVEL[a.risco_cancelamento.nivel]}${a.risco_cancelamento.motivos.length ? ` (${a.risco_cancelamento.motivos.join("; ")})` : ""}`,
    `Oportunidade de venda: ${NIVEL[a.oportunidade_venda.nivel]}`,
    `Upsell: ${NIVEL[a.upsell.nivel]}${a.upsell.sugestao ? ` (${a.upsell.sugestao})` : ""}`,
    "",
    `Resumo: ${a.resumo}`,
    `Próxima ação: ${a.proxima_acao}`,
    a.objecoes.length ? `Objeções: ${a.objecoes.join("; ")}` : "",
    "",
    `Mensagem sugerida: ${a.mensagem_sugerida}`,
  ];
  return linhas.filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n").trim();
}

/** Título curto, ex.: "WhatsApp · Maria Souza · risco alto". */
export function tituloCurto(r: AnalysisRecord, contatoNome?: string): string {
  const risco = r.analise.risco_cancelamento.nivel;
  const venda = r.analise.oportunidade_venda.nivel;
  const destaque =
    risco === "alta" ? "risco de cancelamento alto" : venda === "alta" ? "oportunidade de venda" : r.analise.sentimento.geral;
  return `${CANAL_NOME[r.conversa.canal]} · ${contatoNome ?? r.conversa.contato} · ${destaque}`.slice(0, 250);
}
