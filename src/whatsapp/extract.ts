import type { WaChat } from "./types";

/**
 * Lê a conversa aberta no WhatsApp Web a partir do DOM.
 *
 * Precisa ser autocontida (sem imports em tempo de execução): também é
 * injetada via chrome.scripting.executeScript. Os seletores dependem do
 * HTML do WhatsApp Web, que muda sem aviso — se a captura quebrar, é aqui
 * que se ajusta. Só as mensagens já carregadas na tela são capturadas:
 * role a conversa para cima para incluir mensagens antigas.
 */
export function extractWhatsAppChat(): WaChat | { erro: string } {
  const SEL = {
    main: "#main",
    contato: "header span[dir='auto']",
    mensagem: "div.copyable-text[data-pre-plain-text]",
    texto: "span.selectable-text",
  };

  const main = document.querySelector(SEL.main);
  if (!main) return { erro: "Abra uma conversa no WhatsApp Web antes de capturar." };

  const contato = main.querySelector(SEL.contato)?.textContent?.trim() || "Contato";
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
  return { contato, capturadoEm: new Date().toISOString(), mensagens };
}
