import { connectors, getConnector } from "../../integrations/registry";
import { storage } from "../../lib/storage";
import { useStored } from "../../lib/useStorage";

interface Props {
  onOpen(id: string): void;
  onChat(ids?: string[]): void;
}

export function Hub({ onOpen, onChat }: Props) {
  const integrations = useStored("integrations", storage.getIntegrations, []);

  return (
    <section className="hub">
      <div className="hero">
        <h1>Quem sabe faz a hora</h1>
        <p>Todos os seus sistemas num só lugar. Pergunte, cruze dados e aja, sem esperar acontecer.</p>
        <button className="primary" onClick={() => onChat()}>
          💬 Conversar com o Claude
        </button>
      </div>

      <div className="section-title">
        <h2>Sistemas integrados</h2>
        <button className="link" onClick={() => chrome.runtime.openOptionsPage()}>
          + Adicionar
        </button>
      </div>

      {integrations.length === 0 ? (
        <div className="empty">
          <p>Nenhum sistema conectado ainda.</p>
          <p className="muted">Conectores disponíveis: {connectors.map((c) => `${c.emoji} ${c.name}`).join(" · ")}</p>
          <button onClick={() => chrome.runtime.openOptionsPage()}>Conectar o primeiro sistema</button>
        </div>
      ) : (
        <ul className="cards">
          {integrations.map((i) => {
            const c = getConnector(i.connectorId);
            return (
              <li key={i.id} className={`card ${i.enabled ? "" : "disabled"}`} onClick={() => onOpen(i.id)}>
                <span className="emoji">{c.emoji}</span>
                <div className="card-body">
                  <strong>{i.name}</strong>
                  <span className="muted">{c.name}{i.enabled ? "" : " · desativado"}</span>
                </div>
                <button
                  className="icon"
                  title={`Conversar sobre ${i.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChat([i.id]);
                  }}
                >
                  💬
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
