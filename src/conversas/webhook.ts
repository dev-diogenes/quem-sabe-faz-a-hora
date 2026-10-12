import type { AnalysisRecord } from "../lib/storage";

/** Origem no formato de permissão de host do Chrome, ex.: https://n8n.empresa.com/* */
export function webhookOrigin(url: string): string {
  return `${new URL(url).origin}/*`;
}

/**
 * Envia a análise para o webhook configurado (n8n, Zapier, Make), que
 * decide o que atualizar. Vão o contato, o identificador (telefone ou
 * e-mail, para casar com o CRM) e a análise; a transcrição é opcional.
 */
export async function sendToWebhook(url: string, record: AnalysisRecord, incluirMensagens: boolean): Promise<void> {
  const { conversa } = record;
  const payload = {
    origem: "quem-sabe-faz-a-hora",
    tipo: "analise_conversa",
    id: record.id,
    canal: conversa.canal,
    contato: conversa.contato,
    identificador: conversa.identificador,
    assunto: conversa.assunto,
    anonimizado: record.anonimizado,
    capturadoEm: conversa.capturadoEm,
    analisadoEm: record.analisadoEm,
    analise: record.analise,
    ...(incluirMensagens ? { mensagens: conversa.mensagens } : {}),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook respondeu ${res.status} ${res.statusText}`);
}
