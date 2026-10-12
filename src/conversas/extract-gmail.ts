import type { Conversa } from "./types";

/**
 * Lê a thread de e-mail aberta no Gmail, consolidando todas as mensagens
 * expandidas. Autocontida pelo mesmo motivo de extract-whatsapp.ts. Os
 * seletores dependem do HTML do Gmail; mensagens recolhidas não têm corpo
 * no DOM, então são contadas em `naoCapturadas` (use "Expandir tudo").
 */
export function extractGmailThread(): Conversa | { erro: string } {
  const SEL = {
    assunto: "h2.hP",
    mensagem: "div.adn",
    remetente: "span.gD[email]",
    data: "span.g3",
    corpo: "div.a3s",
    citacao: ".gmail_quote, .gmail_extra, blockquote",
    destinatario: "span.g2[email]",
  };

  const assunto = document.querySelector(SEL.assunto)?.textContent?.trim();
  const blocos = [...document.querySelectorAll<HTMLElement>(SEL.mensagem)];
  if (!assunto || !blocos.length) return { erro: "Abra uma conversa (thread) no Gmail antes de capturar." };

  // O título da aba traz o e-mail da conta: "Assunto - fulano@empresa.com - Gmail".
  const minhaConta = document.title.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]?.toLowerCase();

  let naoCapturadas = 0;
  const mensagens = blocos.flatMap((bloco) => {
    const corpo = bloco.querySelector<HTMLElement>(SEL.corpo);
    if (!corpo) {
      naoCapturadas++;
      return [];
    }
    const clone = corpo.cloneNode(true) as HTMLElement;
    // Remove o histórico citado: cada mensagem da thread já aparece inteira.
    clone.querySelectorAll(SEL.citacao).forEach((q) => q.remove());
    const remetente = bloco.querySelector<HTMLElement>(SEL.remetente);
    const email = remetente?.getAttribute("email")?.toLowerCase() ?? "";
    const dataEl = bloco.querySelector<HTMLElement>(SEL.data);
    return [
      {
        autor: remetente?.getAttribute("name") || remetente?.textContent?.trim() || email || "Remetente",
        email,
        direcao: minhaConta && email === minhaConta ? ("enviada" as const) : ("recebida" as const),
        horario: dataEl?.getAttribute("title") || dataEl?.textContent?.trim() || "",
        texto: clone.innerText.replace(/\n{3,}/g, "\n\n").trim() || "[sem texto]",
      },
    ];
  });

  if (!mensagens.length) {
    return { erro: "As mensagens da thread estão recolhidas. Clique em “Expandir tudo” no Gmail e capture de novo." };
  }

  // Cliente = primeiro remetente que não é a sua conta; se só você escreveu,
  // o primeiro destinatário.
  const externo = mensagens.find((m) => m.direcao === "recebida");
  const destinatario = document.querySelector<HTMLElement>(SEL.destinatario);
  const identificador = externo?.email || destinatario?.getAttribute("email")?.toLowerCase() || undefined;
  const contato = externo?.autor || destinatario?.getAttribute("name") || identificador || "Contato";

  return {
    canal: "email",
    contato,
    identificador,
    assunto,
    capturadoEm: new Date().toISOString(),
    mensagens,
    naoCapturadas: naoCapturadas || undefined,
  };
}
