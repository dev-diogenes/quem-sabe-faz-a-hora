import { connectors, getConnector } from "../../integrations/registry";
import type { Integration } from "../../integrations/types";
import { storage, type AnalysisRecord } from "../../lib/storage";
import { useStored } from "../../lib/useStorage";
import { ChatIcon, ConnectorIcon, PlusIcon } from "../Icons";

interface Props {
  onOpen(id: string): void;
  onChat(ids?: string[]): void;
  onConversations(): void;
}

const today = () =>
  new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

function SystemRow({ i, onOpen, onChat }: { i: Integration; onOpen(): void; onChat(): void }) {
  const c = getConnector(i.connectorId);
  return (
    <li className="row-card">
      <button className="row-main" onClick={onOpen}>
        <ConnectorIcon id={i.connectorId} />
        <span className="row-body">
          <strong>{i.name}</strong>
          <span className="muted">{c.name}</span>
        </span>
        <span className={`status ${i.enabled ? "ok" : "none"}`}>{i.enabled ? "Ativo" : "Desativado"}</span>
      </button>
      <button className="icon" aria-label={`Conversar sobre ${i.name}`} onClick={onChat}>
        <ChatIcon />
      </button>
    </li>
  );
}

export function Hub({ onOpen, onChat, onConversations }: Props) {
  const integrations = useStored("integrations", storage.getIntegrations, []);
  const history = useStored<AnalysisRecord[]>("conversationHistory", storage.getHistory, []);
  const ativos = integrations.filter((i) => i.enabled);
  const desativados = integrations.filter((i) => !i.enabled);
  const riscos = history.filter((r) => r.analise.risco_cancelamento.nivel === "alta").length;

  return (
    <section className="page">
      <div className="poster-card">
        <span className="kicker">{today()}</span>
        <h1 className="poster">Quem sabe faz a hora</h1>
        <p>Seus sistemas em marcha. Pergunte, cruze dados e aja, sem esperar acontecer.</p>
        <button className="primary" onClick={() => onChat()}>
          <ChatIcon /> Perguntar ao Claude
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="value">{ativos.length}</span>
          <span className="label">Sistemas ativos</span>
        </div>
        <button className="stat" onClick={onConversations}>
          <span className="value">{history.length}</span>
          <span className="label">Conversas analisadas</span>
        </button>
        <button className="stat" onClick={onConversations}>
          <span className={`value ${riscos ? "danger" : ""}`}>{riscos}</span>
          <span className="label">Riscos altos</span>
        </button>
      </div>

      <div className="section-title">
        <h2>Sistemas integrados</h2>
        <button className="link" onClick={() => chrome.runtime.openOptionsPage()}>
          <PlusIcon size={14} /> Conectar
        </button>
      </div>

      {integrations.length === 0 ? (
        <div className="empty">
          <p>Nenhum sistema conectado ainda.</p>
          <p className="muted">Conectores disponíveis: {connectors.map((c) => c.name).join(" · ")}</p>
          <button onClick={() => chrome.runtime.openOptionsPage()}>Conectar o primeiro sistema</button>
        </div>
      ) : (
        <>
          {ativos.length > 0 && (
            <div className="group">
              <span className="group-label ok">Em marcha <b>{ativos.length}</b></span>
              <ul className="rows">
                {ativos.map((i) => (
                  <SystemRow key={i.id} i={i} onOpen={() => onOpen(i.id)} onChat={() => onChat([i.id])} />
                ))}
              </ul>
            </div>
          )}
          {desativados.length > 0 && (
            <div className="group">
              <span className="group-label none">Desativados <b>{desativados.length}</b></span>
              <ul className="rows">
                {desativados.map((i) => (
                  <SystemRow key={i.id} i={i} onOpen={() => onOpen(i.id)} onChat={() => onChat([i.id])} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="verse">“Caminhando e cantando e seguindo a canção”</p>
    </section>
  );
}
