import type { AnalysisRecord } from "../lib/storage";

/** Origem no formato de permissão de host do Chrome, ex.: https://n8n.empresa.com/* */
export function webhookOrigin(url: string): string {
  return `${new URL(url).origin}/*`;
}

/**
 * Envia a análise para o webhook configurado (n8n, Zapier, Make ou um
 * endpoint do CRM), que decide o que atualizar: nota, tarefa, health score.
 * Por padrão vão só o contato e a análise; a transcrição fica opcional.
 */
export async function sendToWebhook(url: string, record: AnalysisRecord, incluirMensagens: boolean): Promise<void> {
  const payload = {
    origem: "quem-sabe-faz-a-hora",
    tipo: "analise_conversa_whatsapp",
    id: record.id,
    contato: record.chat.contato,
    anonimizado: record.anonimizado,
    capturadoEm: record.chat.capturadoEm,
    analisadoEm: record.analisadoEm,
    analise: record.analise,
    ...(incluirMensagens ? { mensagens: record.chat.mensagens } : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook respondeu ${res.status} ${res.statusText}`);
}
