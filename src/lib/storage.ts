import type Anthropic from "@anthropic-ai/sdk";
import type { Integration } from "../integrations/types";
import type { ConversationAnalysis } from "../conversas/analysis";
import type { Conversa } from "../conversas/types";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/** Para onde vai a análise de uma conversa. */
export type Destino = "webhook" | "sd_atividade" | "sd_dados" | "sd_nota";

export interface SensedataConfig {
  /** Token gerado em SenseConnect > Gerenciador de chave de API. */
  token: string;
  baseUrl: string;
  /** E-mail do usuário Sensedata responsável pelas atividades criadas. */
  responsavel: string;
  tipoAtividade: string;
  statusAtividade: string;
  prioridadeAtividade: string;
  /** Tipo (tabela) dos dados customizados. */
  tipoDado: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  effort: Effort;
  /** Destino de webhook (n8n, Zapier, Make). Vazio = desligado. */
  webhookUrl: string;
  /** Envia também a transcrição, além da análise. */
  webhookIncluirMensagens: boolean;
  sensedata: SensedataConfig;
  destinoPadrao: Destino;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-opus-5-5",
  effort: "medium",
  webhookUrl: "",
  webhookIncluirMensagens: false,
  sensedata: {
    token: "",
    baseUrl: "https://api.sensedata.io",
    responsavel: "",
    tipoAtividade: "",
    statusAtividade: "",
    prioridadeAtividade: "",
    tipoDado: "analise_conversa",
  },
  destinoPadrao: "sd_atividade",
};

export interface ToolActivity {
  name: string;
  system: string;
  status: "running" | "ok" | "error";
}

/** O que a interface do chat mostra. */
export interface DisplayMessage {
  role: "user" | "assistant";
  text: string;
  tools?: ToolActivity[];
  context?: string[];
  error?: string;
}

/**
 * A conversa com o Claude guarda dois históricos: o da API (com blocos de
 * tool use, thinking etc., sempre só acrescentado) e o simplificado para exibição.
 */
export interface Conversation {
  api: Anthropic.Beta.BetaMessageParam[];
  display: DisplayMessage[];
}

/** Um envio da análise para um destino. */
export interface Envio {
  destino: Destino;
  em: string;
  /** Contato do Sensedata ao qual a análise foi vinculada. */
  contato?: { id: number; nome: string; idCliente: number };
}

/** Conversa capturada (WhatsApp ou e-mail) e, se houver, sua análise. */
export interface Captura {
  id: string;
  conversa: Conversa;
  anonimizado: boolean;
  analise?: ConversationAnalysis;
  analisadoEm?: string;
  envios?: Envio[];
}

/** Uma conversa analisada, guardada no histórico. */
export type AnalysisRecord = Captura & { analise: ConversationAnalysis; analisadoEm: string };

const MAX_HISTORY = 50;
const EMPTY_CONVERSATION: Conversation = { api: [], display: [] };

async function read<T>(key: string, fallback: T): Promise<T> {
  const data = await chrome.storage.local.get(key);
  return (data[key] as T | undefined) ?? fallback;
}

const write = (key: string, value: unknown) => chrome.storage.local.set({ [key]: value });

export const storage = {
  async getSettings(): Promise<Settings> {
    const s = await read<Partial<Settings>>("settings", {});
    return { ...DEFAULT_SETTINGS, ...s, sensedata: { ...DEFAULT_SETTINGS.sensedata, ...s.sensedata } };
  },
  saveSettings: (s: Settings) => write("settings", s),

  getIntegrations: () => read<Integration[]>("integrations", []),
  saveIntegrations: (list: Integration[]) => write("integrations", list),

  getConversation: () => read<Conversation>("conversation", EMPTY_CONVERSATION),
  saveConversation: (c: Conversation) => write("conversation", c),
  clearConversation: () => write("conversation", EMPTY_CONVERSATION),

  getCaptura: () => read<Captura | null>("captura", null),
  saveCaptura: (c: Captura | null) => write("captura", c),

  getHistory: () => read<AnalysisRecord[]>("conversationHistory", []),
  /** Insere ou atualiza um registro, mantendo os mais recentes primeiro. */
  async upsertHistory(record: AnalysisRecord) {
    const list = (await read<AnalysisRecord[]>("conversationHistory", [])).filter((r) => r.id !== record.id);
    await write("conversationHistory", [record, ...list].slice(0, MAX_HISTORY));
  },
  clearHistory: () => write("conversationHistory", []),
};

/** Hook simples: chama `cb` quando uma chave do storage muda. */
export function onStorageChange(key: string, cb: () => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && key in changes) cb();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
