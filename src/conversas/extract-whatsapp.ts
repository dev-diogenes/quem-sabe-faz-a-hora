import type { Conversa } from "./types";

/**
 * Lê a conversa aberta no WhatsApp Web a partir do DOM.
 *
 * Precisa ser autocontida (sem imports em tempo de execução): também é
 * injetada via chrome.scripting.executeScript. Os seletores dependem do
 * HTML do WhatsApp Web, que muda sem aviso — se a captura quebrar, é aqui
 * que se ajusta. Só as mensagens já carregadas na tela são capturadas:
 * role a conversa para cima para incluir mensagens antigas.
 */
export function extractWhatsAppChat(): Conversa | { erro: string } {
  const SEL = {
    main: "#main",
    contato: "header span[dir='auto']",
    mensagem: "div.copyable-text[data-pre-plain-text]",
    texto: "span.selectable-text",
    // Linhas de mensagem carregam o número do chat: "false_5511987654321@c.us_3EB0..."
    idMensagem: "[data-id*='@c.us']",
  };

  const main = document.querySelector(SEL.main);
  if (!main) return { erro: "Abra uma conversa no WhatsApp Web antes de capturar." };

  const contato = main.querySelector(SEL.contato)?.textContent?.trim() || "Contato";

  // Telefone do cliente: pelo data-id das mensagens; se o contato não estiver
  // salvo, o próprio título do chat é o número.
  const dataId = main.querySelector(SEL.idMensagem)?.getAttribute("data-id") ?? "";
  const doId = dataId.match(/_(\d{8,15})@c\.us/)?.[1];
  const doTitulo = /^\+?[\d\s()-]{8,}$/.test(contato) ? contato.replace(/\D/g, "") : undefined;
  const identificador = doId || doTitulo;

  const mensagens = [...main.querySelectorAll<HTMLElement>(SEL.mensagem)].map((el) => {
    // Formato do atributo: "[10:32, 12/10/2026] Fulano: "
    const meta = el.getAttribute("data-pre-plain-text") ?? "";
    const m = meta.match(/^\[([^\]]+)\]\s*(.*?):\s*$/);
    const enviada = !!el.closest(".message-out");
    const texto =
      [...el.querySelectorAll<HTMLElement>(SEL.texto)].map((s) => s.innerText).join("\n").trim() ||
      el.innerText.trim() ||
      "[mídia]";
    return {
      autor: m?.[2] || (enviada ? "Você" : contato),
      direcao: enviada ? ("enviada" as const) : ("recebida" as const),
      horario: m?.[1] ?? "",
      texto,
    };
  });

  if (!mensagens.length) return { erro: "Nenhuma mensagem de texto encontrada na conversa aberta." };
  return { canal: "whatsapp", contato, identificador, capturadoEm: new Date().toISOString(), mensagens };
}
