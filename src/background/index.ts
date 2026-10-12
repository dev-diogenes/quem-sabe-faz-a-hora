import { ANALYZE_CHAT, CHAT_PORT, type ChatEvent, type ChatRequest } from "../lib/messages";
import { analyzeChat } from "./analyze";
import { runChatTurn } from "./claude";

// Clique no ícone da extensão abre o painel lateral.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== CHAT_PORT) return;

  let connected = true;
  port.onDisconnect.addListener(() => (connected = false));

  // Se o painel fechar no meio da resposta, a conversa continua sendo
  // salva no storage; só paramos de emitir eventos.
  const emit = (event: ChatEvent) => {
    if (connected) port.postMessage(event);
  };

  port.onMessage.addListener((req: ChatRequest) => {
    if (req.type !== "send") return;
    runChatTurn(req, emit).catch((e) => {
      emit({ type: "error", message: String(e?.message ?? e) });
      emit({ type: "done" });
    });
  });
});

// Análise de conversas (WhatsApp e e-mail): pedido/resposta simples, sem streaming.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== ANALYZE_CHAT) return;
  analyzeChat(msg.chat)
    .then((analise) => sendResponse({ ok: true, analise }))
    .catch((e) => sendResponse({ ok: false, erro: String(e?.message ?? e) }));
  return true; // resposta assíncrona
});
