import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { storage } from "../lib/storage";
import { ConversationAnalysisSchema, type ConversationAnalysis } from "../whatsapp/analysis";
import type { WaChat } from "../whatsapp/types";

const SYSTEM_PROMPT = `Você analisa conversas comerciais e de atendimento do WhatsApp para equipes de vendas e Customer Success.

Avalie a conversa do ponto de vista do cliente:
- Sentimento: como o cliente se sente e como isso mudou ao longo da conversa.
- Satisfação: nota de 1 a 5 para a satisfação do cliente com o atendimento e o produto.
- Oportunidade de venda: sinais de interesse em comprar (pedidos de preço, prazo, condições, comparação).
- Upsell: sinais de que o cliente se beneficiaria de um plano, volume ou produto maior.
- Risco de cancelamento: insatisfação, menção a concorrentes, pedidos de cancelamento, atrasos recorrentes, silêncio após problema.

Regras:
- Baseie cada nível em evidências da conversa; cite trechos curtos nas evidências.
- Se não houver sinal, use o nível "nenhuma" e deixe as evidências vazias. Não invente.
- Escreva em português do Brasil.`;

export async function analyzeChat(chat: WaChat): Promise<ConversationAnalysis> {
  const settings = await storage.getSettings();
  if (!settings.apiKey) throw new Error("Configure sua chave da API da Anthropic nas opções da extensão.");

  const transcript = chat.mensagens.map((m) => `[${m.horario}] ${m.autor} (${m.direcao}): ${m.texto}`).join("\n");
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  const response = await client.beta.messages.parse({
    model: settings.model,
    max_tokens: 16000,
    output_config: { effort: settings.effort, format: betaZodOutputFormat(ConversationAnalysisSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `<conversa contato="${chat.contato}">\n${transcript}\n</conversa>` }],
  });

  if (response.stop_reason === "refusal") throw new Error("O modelo recusou analisar esta conversa.");
  if (response.stop_reason === "max_tokens") throw new Error("A análise foi cortada por tamanho. Tente uma conversa menor.");
  if (!response.parsed_output) throw new Error("Não foi possível ler a análise retornada.");
  return response.parsed_output;
}
