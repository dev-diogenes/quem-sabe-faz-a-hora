import { CHAT_PORT, type ChatEvent, type ChatRequest } from "../lib/messages";
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
