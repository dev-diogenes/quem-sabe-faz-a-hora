import { z } from "zod";

const Nivel = z.enum(["nenhuma", "baixa", "media", "alta"]);

export const ConversationAnalysisSchema = z.object({
  resumo: z.string().describe("Resumo da conversa em 2 a 4 frases."),
  sentimento: z.object({
    geral: z.enum(["positivo", "neutro", "negativo", "misto"]),
    score: z.number().describe("De -1 (muito negativo) a 1 (muito positivo)."),
    evolucao: z.string().describe("Como o sentimento do cliente mudou ao longo da conversa."),
  }),
  emocoes: z.array(z.string()).describe("Emoções predominantes do cliente, ex.: frustração, entusiasmo."),
  oportunidade_venda: z.object({ nivel: Nivel, evidencias: z.array(z.string()) }),
  upsell: z.object({
    nivel: Nivel,
    sugestao: z.string().describe("O que oferecer a mais, ou vazio se não houver."),
    evidencias: z.array(z.string()),
  }),
  risco_cancelamento: z.object({
    nivel: Nivel,
    motivos: z.array(z.string()),
    evidencias: z.array(z.string()),
  }),
  objecoes: z.array(z.string()),
  proxima_acao: z.string().describe("A ação mais importante para o atendente agora."),
  mensagem_sugerida: z.string().describe("Uma resposta pronta para enviar ao cliente, no tom da conversa."),
});

export type ConversationAnalysis = z.infer<typeof ConversationAnalysisSchema>;
export type Nivel = z.infer<typeof Nivel>;
