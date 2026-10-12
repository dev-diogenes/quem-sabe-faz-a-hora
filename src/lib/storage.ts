import type Anthropic from "@anthropic-ai/sdk";
import type { Integration } from "../integrations/types";
import type { ConversationAnalysis } from "../whatsapp/analysis";
import type { WaChat } from "../whatsapp/types";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface Settings {
  apiKey: string;
  model: string;
  effort: Effort;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-opus-5-5",
  effort: "medium",
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
 * A conversa guarda dois históricos: o da API (com blocos de tool use,
 * thinking etc., sempre só acrescentado) e o simplificado para exibição.
 */
export interface Conversation {
  api: Anthropic.Beta.BetaMessageParam[];
  display: DisplayMessage[];
}

/** Última conversa do WhatsApp capturada e sua análise, se houver. */
export interface WhatsAppCapture {
  chat: WaChat;
  analise?: ConversationAnalysis;
  anonimizado: boolean;
}

const EMPTY_CONVERSATION: Conversation = { api: [], display: [] };

async function read<T>(key: string, fallback: T): Promise<T> {
  const data = await chrome.storage.local.get(key);
  return (data[key] as T | undefined) ?? fallback;
}

const write = (key: string, value: unknown) => chrome.storage.local.set({ [key]: value });

export const storage = {
  getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await read<Partial<Settings>>("settings", {})) }),
  saveSettings: (s: Settings) => write("settings", s),

  getIntegrations: () => read<Integration[]>("integrations", []),
  saveIntegrations: (list: Integration[]) => write("integrations", list),

  getConversation: () => read<Conversation>("conversation", EMPTY_CONVERSATION),
  saveConversation: (c: Conversation) => write("conversation", c),
  clearConversation: () => write("conversation", EMPTY_CONVERSATION),

  getWhatsApp: () => read<WhatsAppCapture | null>("whatsapp", null),
  saveWhatsApp: (c: WhatsAppCapture | null) => write("whatsapp", c),
};

/** Hook simples: chama `cb` quando uma chave do storage muda. */
export function onStorageChange(key: string, cb: () => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && key in changes) cb();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
