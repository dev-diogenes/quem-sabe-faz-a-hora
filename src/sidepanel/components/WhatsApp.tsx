import { useState } from "react";
import { ANALYZE_CHAT, GET_WHATSAPP_CHAT } from "../../lib/messages";
import { storage, type WhatsAppCapture } from "../../lib/storage";
import { useStored } from "../../lib/useStorage";
import { anonymize } from "../../whatsapp/anonymize";
import type { ConversationAnalysis, Nivel } from "../../whatsapp/analysis";
import { download } from "../../whatsapp/export";
import { extractWhatsAppChat } from "../../whatsapp/extract";
import type { WaChat } from "../../whatsapp/types";

const WHATSAPP_URL = "https://web.whatsapp.com/";

async function captureOpenChat(): Promise<WaChat> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith(WHATSAPP_URL)) {
    throw new Error("Abra o WhatsApp Web nesta aba e selecione uma conversa.");
  }
  let res: WaChat | { erro: string } | undefined;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: GET_WHATSAPP_CHAT });
  } catch {
    // Aba aberta antes da instalação: injeta a mesma função sob demanda.
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractWhatsAppChat });
    res = r?.result as typeof res;
  }
  if (!res) throw new Error("Não foi possível ler a conversa.");
  if ("erro" in res) throw new Error(res.erro);
  return res;
}

const NIVEL_LABEL: Record<Nivel, string> = { nenhuma: "Nenhuma", baixa: "Baixa", media: "Média", alta: "Alta" };

function Level({ nivel, risco }: { nivel: Nivel; risco?: boolean }) {
  // Em risco de cancelamento, nível alto é ruim; em venda/upsell é bom.
  const tone = nivel === "nenhuma" ? "none" : nivel === "baixa" ? "low" : nivel === "media" ? "mid" : "high";
  return <span className={`level ${tone} ${risco ? "risk" : ""}`}>{NIVEL_LABEL[nivel]}</span>;
}

function SignalCard(props: { title: string; nivel: Nivel; risco?: boolean; evidencias: string[]; extra?: string }) {
  return (
    <div className="signal">
      <div className="signal-head">
        <strong>{props.title}</strong>
        <Level nivel={props.nivel} risco={props.risco} />
      </div>
      {props.extra && <p>{props.extra}</p>}
      {props.evidencias.length > 0 && (
        <ul>
          {props.evidencias.map((e, i) => (
            <li key={i}>“{e}”</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Analysis({ a }: { a: ConversationAnalysis }) {
  const [copied, setCopied] = useState(false);
  const pct = Math.round(((Math.max(-1, Math.min(1, a.sentimento.score)) + 1) / 2) * 100);
  return (
    <div className="analysis">
      <div className="sentiment">
        <div className="signal-head">
          <strong>Sentimento</strong>
          <span className={`level sent-${a.sentimento.geral}`}>{a.sentimento.geral}</span>
        </div>
        <div className="meter" role="img" aria-label={`Score de sentimento ${a.sentimento.score.toFixed(2)}`}>
          <span style={{ left: `${pct}%` }} />
        </div>
        <p className="muted">{a.sentimento.evolucao}</p>
        {a.emocoes.length > 0 && (
          <div className="tags">
            {a.emocoes.map((e) => (
              <span key={e} className="chip">{e}</span>
            ))}
          </div>
        )}
      </div>

      <p>{a.resumo}</p>

      <SignalCard title="Oportunidade de venda" nivel={a.oportunidade_venda.nivel} evidencias={a.oportunidade_venda.evidencias} />
      <SignalCard title="Upsell" nivel={a.upsell.nivel} evidencias={a.upsell.evidencias} extra={a.upsell.sugestao} />
      <SignalCard
        title="Risco de cancelamento"
        nivel={a.risco_cancelamento.nivel}
        risco
        evidencias={a.risco_cancelamento.evidencias}
        extra={a.risco_cancelamento.motivos.join(" · ")}
      />

      {a.objecoes.length > 0 && (
        <div className="signal">
          <strong>Objeções</strong>
          <ul>{a.objecoes.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}

      <div className="signal next">
        <strong>Próxima ação</strong>
        <p>{a.proxima_acao}</p>
        <strong>Mensagem sugerida</strong>
        <p className="suggested">{a.mensagem_sugerida}</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(a.mensagem_sugerida);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copiada ✓" : "Copiar mensagem"}
        </button>
      </div>
    </div>
  );
}

export function WhatsApp() {
  const capture = useStored<WhatsAppCapture | null>("whatsapp", storage.getWhatsApp, null);
  const [anonimizar, setAnonimizar] = useState(true);
  const [busy, setBusy] = useState<"capture" | "analyze">();
  const [error, setError] = useState<string>();

  const run = async (kind: "capture" | "analyze", fn: () => Promise<void>) => {
    setBusy(kind);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  };

  const capturar = () =>
    run("capture", async () => {
      const chat = await captureOpenChat();
      await storage.saveWhatsApp({ chat: anonimizar ? anonymize(chat) : chat, anonimizado: anonimizar });
    });

  const analisar = () =>
    run("analyze", async () => {
      if (!capture) return;
      const res = await chrome.runtime.sendMessage({ type: ANALYZE_CHAT, chat: capture.chat });
      if (!res?.ok) throw new Error(res?.erro ?? "Falha na análise.");
      await storage.saveWhatsApp({ ...capture, analise: res.analise });
    });

  return (
    <section className="hub whatsapp">
      <div className="hero">
        <h1>Conversas do WhatsApp</h1>
        <p>Capture a conversa aberta no WhatsApp Web, exporte e descubra sentimento, venda, upsell e risco de cancelamento.</p>
        <label className="switch">
          <input type="checkbox" checked={anonimizar} onChange={(e) => setAnonimizar(e.target.checked)} />
          Anonimizar nomes, telefones, e-mails e documentos
        </label>
        <button className="primary" onClick={capturar} disabled={!!busy}>
          {busy === "capture" ? "Capturando…" : "Capturar conversa aberta"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {capture && (
        <>
          <div className="section-title">
            <div>
              <h2>{capture.chat.contato}</h2>
              <span className="muted">
                {capture.chat.mensagens.length} mensagens · {new Date(capture.chat.capturadoEm).toLocaleString("pt-BR")}
                {capture.anonimizado ? " · anonimizada" : ""}
              </span>
            </div>
            <button className="link" onClick={() => void storage.saveWhatsApp(null)}>
              Descartar
            </button>
          </div>

          <div className="row wrap">
            <span className="muted">Exportar:</span>
            <button onClick={() => download(capture.chat, "json", capture.analise)}>JSON</button>
            <button onClick={() => download(capture.chat, "csv")}>CSV</button>
            <button onClick={() => download(capture.chat, "txt")}>TXT</button>
          </div>

          <button className="primary" onClick={analisar} disabled={!!busy}>
            {busy === "analyze" ? "Analisando…" : capture.analise ? "Analisar novamente" : "Analisar com o Claude"}
          </button>
          <p className="muted small">
            A conversa{capture.anonimizado ? " anonimizada" : ""} é enviada à API da Anthropic para análise. Use só com
            conversas que você tem autorização para tratar (LGPD).
          </p>

          {capture.analise && <Analysis a={capture.analise} />}
        </>
      )}
    </section>
  );
}
