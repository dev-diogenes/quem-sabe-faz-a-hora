import { useEffect, useState } from "react";
import { ANALYZE_CHAT, GET_CONVERSATION } from "../../lib/messages";
import { storage, type AnalysisRecord, type Captura, type Destino, type Envio } from "../../lib/storage";
import { useStored } from "../../lib/useStorage";
import { anonymize } from "../../conversas/anonymize";
import type { ConversationAnalysis, Nivel } from "../../conversas/analysis";
import { download } from "../../conversas/export";
import { extractGmailThread } from "../../conversas/extract-gmail";
import { extractWhatsAppChat } from "../../conversas/extract-whatsapp";
import { sensedata, type SdContato } from "../../conversas/sensedata";
import { CANAL_NOME, type Canal, type Conversa } from "../../conversas/types";
import { sendToWebhook } from "../../conversas/webhook";
import { CheckIcon, MailIcon, WhatsAppIcon } from "../Icons";

const FONTES: { canal: Canal; prefixo: string; extrair: () => Conversa | { erro: string } }[] = [
  { canal: "whatsapp", prefixo: "https://web.whatsapp.com/", extrair: extractWhatsAppChat },
  { canal: "email", prefixo: "https://mail.google.com/", extrair: extractGmailThread },
];

async function abaAtiva() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function capturarAbaAtiva(): Promise<Conversa> {
  const tab = await abaAtiva();
  const fonte = FONTES.find((f) => tab?.url?.startsWith(f.prefixo));
  if (!tab?.id || !fonte) throw new Error("Abra uma conversa no WhatsApp Web ou uma thread no Gmail nesta aba.");
  let res: Conversa | { erro: string } | undefined;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: GET_CONVERSATION });
  } catch {
    // Aba aberta antes da instalação: injeta a mesma função sob demanda.
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fonte.extrair });
    res = r?.result as typeof res;
  }
  if (!res) throw new Error("Não foi possível ler a conversa.");
  if ("erro" in res) throw new Error(res.erro);
  return res;
}

const DESTINOS: { id: Destino; nome: string; detalhe: string }[] = [
  { id: "sd_atividade", nome: "Sensedata · Atividade", detalhe: "Atividade concluída no contato, com a análise nas anotações" },
  { id: "sd_dados", nome: "Sensedata · Dado customizado", detalhe: "Linha na tabela de dados customizados do cliente" },
  { id: "sd_nota", nome: "Sensedata · Nota do cliente", detalhe: "Nota com a análise no cliente" },
  { id: "webhook", nome: "Webhook", detalhe: "POST em JSON para n8n, Zapier ou Make" },
];

const NIVEL_LABEL: Record<Nivel, string> = { nenhuma: "Nenhuma", baixa: "Baixa", media: "Média", alta: "Alta" };

function Level({ nivel, risco }: { nivel: Nivel; risco?: boolean }) {
  // Em risco de cancelamento, nível alto é ruim; em venda/upsell é bom.
  const tone =
    nivel === "nenhuma" ? "none" : nivel === "baixa" ? "info" : nivel === "media" ? "warn" : risco ? "danger" : "ok";
  return <span className={`status ${tone}`}>{NIVEL_LABEL[nivel]}</span>;
}

function SignalCard(props: { title: string; nivel: Nivel; risco?: boolean; evidencias: string[]; extra?: string }) {
  return (
    <div className="card">
      <div className="card-head">
        <strong>{props.title}</strong>
        <Level nivel={props.nivel} risco={props.risco} />
      </div>
      {props.extra && <p>{props.extra}</p>}
      {props.evidencias.length > 0 && (
        <ul className="quotes">
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
  const sentTone = { positivo: "ok", neutro: "none", negativo: "danger", misto: "warn" }[a.sentimento.geral];
  return (
    <div className="analysis">
      <div className="card">
        <div className="card-head">
          <strong>Sentimento</strong>
          <span className={`status ${sentTone}`}>{a.sentimento.geral}</span>
        </div>
        <div className="meter" role="img" aria-label={`Score de sentimento ${a.sentimento.score.toFixed(2)}`}>
          <span style={{ left: `${pct}%` }} />
        </div>
        <p className="muted">{a.sentimento.evolucao}</p>
        {a.emocoes.length > 0 && (
          <div className="tags">
            {a.emocoes.map((e) => (
              <span key={e} className="tag">{e}</span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <strong>Satisfação</strong>
          <span className="score" role="img" aria-label={`${a.satisfacao.nota} de 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= a.satisfacao.nota ? "on" : ""} />
            ))}
            <b>{a.satisfacao.nota}/5</b>
          </span>
        </div>
        <p className="muted">{a.satisfacao.justificativa}</p>
      </div>

      <p>{a.resumo}</p>

      <SignalCard
        title="Risco de cancelamento"
        nivel={a.risco_cancelamento.nivel}
        risco
        evidencias={a.risco_cancelamento.evidencias}
        extra={a.risco_cancelamento.motivos.join(" · ")}
      />
      <SignalCard title="Oportunidade de venda" nivel={a.oportunidade_venda.nivel} evidencias={a.oportunidade_venda.evidencias} />
      <SignalCard title="Upsell" nivel={a.upsell.nivel} evidencias={a.upsell.evidencias} extra={a.upsell.sugestao} />

      {a.objecoes.length > 0 && (
        <div className="card">
          <strong>Objeções</strong>
          <ul>{a.objecoes.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}

      <div className="card accent">
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
          {copied ? "Copiada" : "Copiar mensagem"}
        </button>
      </div>
    </div>
  );
}

/** Escolha do destino e envio, com localização do contato no Sensedata. */
function EnvioCRM({ record, busy, run }: { record: AnalysisRecord; busy: boolean; run(fn: () => Promise<void>): void }) {
  const settings = useStored("settings", storage.getSettings, null);
  const [destino, setDestino] = useState<Destino>();
  const [contatos, setContatos] = useState<SdContato[]>();
  const [escolhido, setEscolhido] = useState<number>();
  const [ok, setOk] = useState<string>();

  useEffect(() => {
    if (settings && !destino) setDestino(settings.destinoPadrao);
  }, [settings]);
  useEffect(() => {
    setContatos(undefined);
    setOk(undefined);
  }, [record.id, destino]);

  if (!settings || !destino) return null;
  const isSd = destino.startsWith("sd_");
  const id = record.conversa.identificador;
  const contato = contatos?.find((c) => c.id === escolhido);

  const localizar = () =>
    run(async () => {
      if (!id) throw new Error("A conversa não trouxe telefone ou e-mail do cliente para localizar no Sensedata.");
      const achados = await sensedata.localizarContato(settings.sensedata, id);
      setContatos(achados);
      setEscolhido(achados[0]?.id);
    });

  const enviar = () =>
    run(async () => {
      let envio: Envio;
      if (destino === "webhook") {
        if (!settings.webhookUrl) throw new Error("Configure a URL do webhook nas opções.");
        await sendToWebhook(settings.webhookUrl, record, settings.webhookIncluirMensagens);
        envio = { destino, em: new Date().toISOString() };
      } else {
        if (!contato) throw new Error("Localize e escolha o contato do Sensedata primeiro.");
        const sd = settings.sensedata;
        if (destino === "sd_atividade") await sensedata.criarAtividade(sd, record, contato);
        if (destino === "sd_dados") await sensedata.gravarDadoCustomizado(sd, record, contato);
        if (destino === "sd_nota") await sensedata.criarNota(sd, record, contato);
        envio = { destino, em: new Date().toISOString(), contato: { id: contato.id, nome: contato.name, idCliente: contato.id_customer } };
      }
      const atualizado: AnalysisRecord = { ...record, envios: [...(record.envios ?? []), envio] };
      await storage.saveCaptura(atualizado);
      await storage.upsertHistory(atualizado);
      setOk(DESTINOS.find((d) => d.id === destino)!.nome);
    });

  return (
    <div className="card send">
      <strong>Levar para o CRM</strong>
      <label>
        Destino
        <select value={destino} onChange={(e) => setDestino(e.target.value as Destino)}>
          {DESTINOS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
        <small className="muted">{DESTINOS.find((d) => d.id === destino)?.detalhe}</small>
      </label>

      {isSd && (
        <>
          <div className="row wrap">
            <span className="muted">
              {record.conversa.canal === "whatsapp" ? "Telefone" : "E-mail"}: <b>{id ?? "não encontrado"}</b>
            </span>
            <button onClick={localizar} disabled={busy || !id}>
              Localizar contato
            </button>
          </div>
          {contatos?.length === 0 && (
            <p className="error">Nenhum contato do Sensedata com esse {record.conversa.canal === "whatsapp" ? "telefone (phone/phone2)" : "e-mail"}.</p>
          )}
          {contatos && contatos.length > 0 && (
            <label>
              Contato no Sensedata
              <select value={escolhido} onChange={(e) => setEscolhido(Number(e.target.value))}>
                {contatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · cliente #{c.id_customer}
                    {c.is_active === false ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <button className="primary" onClick={enviar} disabled={busy || (isSd && !contato)}>
        Enviar
      </button>
      {ok && (
        <p className="success">
          <CheckIcon size={14} /> Enviada para {ok}.
        </p>
      )}
      {record.envios && record.envios.length > 0 && (
        <ul className="sent-list">
          {record.envios.map((e, i) => (
            <li key={i}>
              {DESTINOS.find((d) => d.id === e.destino)?.nome}
              {e.contato ? ` · ${e.contato.nome}` : ""} · {new Date(e.em).toLocaleString("pt-BR")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function History({ onOpen }: { onOpen(r: AnalysisRecord): void }) {
  const history = useStored<AnalysisRecord[]>("conversationHistory", storage.getHistory, []);
  if (!history.length) return null;
  return (
    <div className="group">
      <div className="section-title">
        <h2>Analisadas recentemente</h2>
        <button className="link" onClick={() => confirm("Apagar o histórico de análises?") && void storage.clearHistory()}>
          Limpar
        </button>
      </div>
      <ul className="rows">
        {history.map((r) => (
          <li key={r.id} className="row-card">
            <button className="row-main" onClick={() => onOpen(r)}>
              <span className={`connector-icon ${r.conversa.canal === "email" ? "tone-blue" : "tone-green"}`}>
                {r.conversa.canal === "email" ? <MailIcon /> : <WhatsAppIcon />}
              </span>
              <span className="row-body">
                <strong>{r.envios?.at(-1)?.contato?.nome ?? r.conversa.contato}</strong>
                <span className="muted">
                  {r.conversa.assunto ? `${r.conversa.assunto} · ` : ""}
                  {new Date(r.analisadoEm).toLocaleDateString("pt-BR")} · satisfação {r.analise.satisfacao.nota}/5
                  {r.envios?.length ? " · no CRM" : ""}
                </span>
              </span>
              <span className="history-levels">
                <span className="history-level">
                  Risco <Level nivel={r.analise.risco_cancelamento.nivel} risco />
                </span>
                <span className="history-level">
                  Venda <Level nivel={r.analise.oportunidade_venda.nivel} />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Conversations() {
  const captura = useStored<Captura | null>("captura", storage.getCaptura, null);
  const [anonimizar, setAnonimizar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fonte, setFonte] = useState<Canal>();

  // Detecta a fonte da aba ativa para ajustar o botão de captura.
  useEffect(() => {
    const detectar = () =>
      void abaAtiva().then((t) => setFonte(FONTES.find((f) => t?.url?.startsWith(f.prefixo))?.canal));
    detectar();
    chrome.tabs.onActivated.addListener(detectar);
    chrome.tabs.onUpdated.addListener(detectar);
    return () => {
      chrome.tabs.onActivated.removeListener(detectar);
      chrome.tabs.onUpdated.removeListener(detectar);
    };
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const capturar = () =>
    run(async () => {
      const conversa = await capturarAbaAtiva();
      await storage.saveCaptura({
        id: crypto.randomUUID(),
        conversa: anonimizar ? anonymize(conversa) : conversa,
        anonimizado: anonimizar,
      });
    });

  const analisar = () =>
    run(async () => {
      if (!captura) return;
      // O identificador (telefone/e-mail) não vai para o Claude.
      const { identificador: _omitido, ...conteudo } = captura.conversa;
      const res = await chrome.runtime.sendMessage({ type: ANALYZE_CHAT, chat: conteudo });
      if (!res?.ok) throw new Error(res?.erro ?? "Falha na análise.");
      const record: AnalysisRecord = { ...captura, analise: res.analise, analisadoEm: new Date().toISOString() };
      await storage.saveCaptura(record);
      await storage.upsertHistory(record);
    });

  const conversa = captura?.conversa;

  return (
    <section className="page">
      <div className="poster-card">
        <span className="kicker">WhatsApp · Gmail · Sensedata</span>
        <h1 className="poster">Conversas</h1>
        <p>Capture a conversa aberta, descubra sentimento, satisfação, venda, upsell e risco de cancelamento, e leve tudo para o CRM.</p>
        <label className="switch light">
          <input type="checkbox" checked={anonimizar} onChange={(e) => setAnonimizar(e.target.checked)} />
          Anonimizar nomes, telefones, e-mails e documentos
        </label>
        <button className="primary" onClick={capturar} disabled={busy}>
          {fonte === "email" ? <MailIcon /> : <WhatsAppIcon />}
          {fonte === "email" ? "Capturar thread do Gmail" : fonte === "whatsapp" ? "Capturar conversa do WhatsApp" : "Capturar conversa aberta"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {captura && conversa && (
        <>
          <div className="section-title">
            <div>
              <h2>
                {CANAL_NOME[conversa.canal]} · {conversa.contato}
              </h2>
              {conversa.assunto && <p className="subject">{conversa.assunto}</p>}
              <span className="muted">
                {conversa.mensagens.length} mensagens · {new Date(conversa.capturadoEm).toLocaleString("pt-BR")}
                {captura.anonimizado ? " · anonimizada" : ""}
              </span>
              {conversa.naoCapturadas && (
                <p className="warn-text">
                  {conversa.naoCapturadas} mensagens recolhidas ficaram de fora. Use “Expandir tudo” no Gmail e capture de novo.
                </p>
              )}
            </div>
            <button className="link" onClick={() => void storage.saveCaptura(null)}>
              Descartar
            </button>
          </div>

          <div className="row wrap">
            <span className="muted">Exportar:</span>
            <button onClick={() => download(conversa, "json", captura.analise)}>JSON</button>
            <button onClick={() => download(conversa, "csv")}>CSV</button>
            <button onClick={() => download(conversa, "txt")}>TXT</button>
          </div>

          <button className="primary block" onClick={analisar} disabled={busy}>
            {busy ? "Trabalhando…" : captura.analise ? "Analisar novamente" : "Analisar com o Claude"}
          </button>
          <p className="muted small">
            O conteúdo{captura.anonimizado ? " anonimizado" : ""} vai para a API da Anthropic. O telefone ou e-mail do cliente
            fica só na extensão, para localizar o contato no CRM. Use só com conversas que você tem autorização para tratar (LGPD).
          </p>

          {captura.analise && captura.analisadoEm && (
            <>
              <Analysis a={captura.analise} />
              <EnvioCRM record={captura as AnalysisRecord} busy={busy} run={run} />
            </>
          )}
        </>
      )}

      <History onOpen={(r) => void storage.saveCaptura(r)} />
    </section>
  );
}
