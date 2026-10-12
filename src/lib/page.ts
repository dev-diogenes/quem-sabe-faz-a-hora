import type { PageContext } from "./messages";

export const MAX_PAGE_CHARS = 30_000;

/**
 * Extrai o texto legível da página. Precisa ser autocontida: também é
 * injetada via chrome.scripting.executeScript em abas abertas antes da
 * instalação da extensão (onde o content script ainda não existe).
 */
export function extractPageContext(): PageContext {
  const max = 30_000;
  const root = document.querySelector("main, article, [role=main]") ?? document.body;
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script, style, noscript, svg, iframe, nav, footer").forEach((el) => el.remove());
  const text = (clone.innerText || clone.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  return { url: location.href, title: document.title, text: text.slice(0, max) };
}
