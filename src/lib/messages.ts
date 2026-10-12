/** Protocolo entre painel lateral, service worker e content script. */

export const CHAT_PORT = "chat";

export interface PageContext {
  url: string;
  title: string;
  text: string;
}

/** Painel -> service worker (via chrome.runtime.connect). */
export type ChatRequest = {
  type: "send";
  text: string;
  integrationIds: string[];
  page?: PageContext;
};

/** Service worker -> painel. */
export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; system: string; status: "running" | "ok" | "error" }
  | { type: "done" }
  | { type: "error"; message: string };

/** Painel -> content script (via chrome.tabs.sendMessage). */
export const GET_PAGE_CONTEXT = "GET_PAGE_CONTEXT";

/** Painel -> content script do WhatsApp Web ou do Gmail. */
export const GET_CONVERSATION = "GET_CONVERSATION";

/** Painel -> service worker (chrome.runtime.sendMessage, com resposta). */
export const ANALYZE_CHAT = "ANALYZE_CHAT";
