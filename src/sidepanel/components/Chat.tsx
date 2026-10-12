import { useEffect, useRef, useState } from "react";
import { getConnector } from "../../integrations/registry";
import { extractPageContext } from "../../lib/page";
import { renderMarkdown } from "../../lib/markdown";
import { CHAT_PORT, GET_PAGE_CONTEXT, type ChatEvent, type ChatRequest, type PageContext } from "../../lib/messages";
import { storage, type Conversation } from "../../lib/storage";
import { useStored } from "../../lib/useStorage";

interface Props {
  focus: string[];
  onFocusChange(ids: string[]): void;
}

async function readActivePage(): Promise<PageContext | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("http")) return undefined;
  try {
    return await chrome.tabs.sendMessage(tab.id, { type: GET_PAGE_CONTEXT });
  } catch {
    // Aba aberta antes da instalação: injeta a mesma função sob demanda.
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractPageContext });
    return res?.result as PageContext | undefined;
  }
}

const SUGGESTIONS = [
  "Quais pedidos estão atrasados e de quais clientes?",
  "Resuma o estado dos meus sistemas hoje.",
  "Essa página tem relação com algum dado dos sistemas?",
];

export function Chat({ focus, onFocusChange }: Props) {
  const integrations = useStored("integrations", storage.getIntegrations, []);
  const conversation = useStored<Conversation>("conversation", storage.getConversation, { api: [], display: [] });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [includePage, setIncludePage] = useState(false);
  const [error, setError] = useState<string>();
  const portRef = useRef<chrome.runtime.Port | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: CHAT_PORT });
    port.onMessage.addListener((event: ChatEvent) => {
      if (event.type === "error") setError(event.message);
      if (event.type === "done") setBusy(false);
    });
    portRef.current = port;
    return () => port.disconnect();
  }, []);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [conversation]);

  const enabled = integrations.filter((i) => i.enabled);

  const toggle = (id: string) =>
    onFocusChange(focus.includes(id) ? focus.filter((f) => f !== id) : [...focus, id]);

  const send = async (text = input) => {
    if (!text.trim() || busy) return;
    setError(undefined);
    setBusy(true);
    setInput("");
    let page: PageContext | undefined;
    if (includePage) {
      try {
        page = await readActivePage();
      } catch (e) {
        setError(`Não foi possível ler a página: ${String(e)}`);
      }
    }
    const req: ChatRequest = { type: "send", text: text.trim(), integrationIds: focus, page };
    portRef.current?.postMessage(req);
  };

  return (
    <section className="chat">
      <div className="context-bar">
        <span className="muted">Contexto:</span>
        {enabled.length === 0 && <span className="muted">nenhum sistema ativo</span>}
        {enabled.map((i) => (
          <button
            key={i.id}
            className={`chip ${focus.includes(i.id) ? "on" : ""}`}
            onClick={() => toggle(i.id)}
            title={focus.length ? "Clique para incluir/remover" : "Sem seleção, todos os sistemas ativos entram no contexto"}
          >
            {getConnector(i.connectorId).emoji} {i.name}
          </button>
        ))}
        <button className={`chip ${includePage ? "on" : ""}`} onClick={() => setIncludePage(!includePage)}>
          📄 Página atual
        </button>
        {conversation.display.length > 0 && (
          <button className="link right" onClick={() => void storage.clearConversation()} disabled={busy}>
            Nova conversa
          </button>
        )}
      </div>

      <div className="messages">
        {conversation.display.length === 0 && (
          <div className="welcome">
            <h2>Caminhando e cantando…</h2>
            <p className="muted">
              Pergunte sobre qualquer sistema integrado. Sem seleção de contexto, o Claude pode consultar todos os
              sistemas ativos.
            </p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {conversation.display.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.context && m.context.length > 0 && <div className="msg-context">{m.context.join(" · ")}</div>}
            {m.tools && m.tools.length > 0 && (
              <div className="tools">
                {m.tools.map((t, j) => (
                  <span key={j} className={`tool ${t.status}`}>
                    {t.status === "running" ? "⏳" : t.status === "ok" ? "✓" : "✗"} {t.system} · {t.name}
                  </span>
                ))}
              </div>
            )}
            {m.role === "assistant" ? (
              <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) || (busy ? "<p class='muted'>Pensando…</p>" : "") }} />
            ) : (
              <p>{m.text}</p>
            )}
            {m.error && <p className="error">{m.error}</p>}
          </div>
        ))}
        {error && !busy && <p className="error">{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={input}
          placeholder="Pergunte sobre seus sistemas…"
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button className="primary" type="submit" disabled={busy || !input.trim()}>
          {busy ? "…" : "Enviar"}
        </button>
      </form>
    </section>
  );
}
