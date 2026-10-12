import { useEffect, useState } from "react";
import { getConnector } from "../../integrations/registry";
import type { Integration, Overview } from "../../integrations/types";
import { storage } from "../../lib/storage";
import { BackIcon, ChatIcon, ConnectorIcon, RefreshIcon } from "../Icons";

interface Props {
  id: string;
  onBack(): void;
  onChat(): void;
}

/** Cor do status pelo texto da célula (atrasado, entregue...). */
function statusTone(v: string | number): string | undefined {
  const s = String(v).toLowerCase();
  if (/atrasad|inadimpl|erro|falh|stuck|cancel/.test(s)) return "danger";
  if (/entregue|conclu|ativo|ok|pago|done|closed/.test(s)) return "ok";
  if (/separando|andamento|pendente|aberto|open|working/.test(s)) return "warn";
  if (/trânsito|transito|enviado/.test(s)) return "info";
  return undefined;
}

export function SystemDetail({ id, onBack, onChat }: Props) {
  const [integration, setIntegration] = useState<Integration>();
  const [overview, setOverview] = useState<Overview>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const found = (await storage.getIntegrations()).find((i) => i.id === id);
      if (!found) throw new Error("Integração não encontrada.");
      setIntegration(found);
      setOverview(await getConnector(found.connectorId).overview(found.config));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const connector = integration && getConnector(integration.connectorId);

  return (
    <section className="page">
      <div className="section-title">
        <button className="link" onClick={onBack}>
          <BackIcon size={16} /> Hub
        </button>
        <button className="icon" aria-label="Atualizar dados" onClick={() => void load()} disabled={loading}>
          <RefreshIcon />
        </button>
      </div>
      {integration && connector && (
        <div className="detail-head">
          <ConnectorIcon id={connector.id} size={24} />
          <div>
            <h1 className="poster small">{integration.name}</h1>
            <span className="muted">{connector.description}</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Carregando dados…</p>}
      {error && <p className="error">{error}</p>}
      {overview && !loading && (
        <>
          <div className="stats">
            {overview.metrics.map((m) => (
              <div key={m.label} className="stat" title={m.hint}>
                <span className="value">{m.value}</span>
                <span className="label">{m.label}</span>
              </div>
            ))}
          </div>
          {overview.tables.map((t) => (
            <div key={t.title} className="table-block">
              <h2>{t.title}</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => {
                          const tone = statusTone(v);
                          return <td key={j}>{tone ? <span className={`status ${tone}`}>{v}</span> : v}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      <button className="primary block" onClick={onChat}>
        <ChatIcon /> Perguntar ao Claude sobre este sistema
      </button>
    </section>
  );
}
