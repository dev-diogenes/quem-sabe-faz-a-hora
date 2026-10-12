import { useEffect, useState } from "react";
import { getConnector } from "../../integrations/registry";
import type { Integration, Overview } from "../../integrations/types";
import { storage } from "../../lib/storage";

interface Props {
  id: string;
  onBack(): void;
  onChat(): void;
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
    <section className="detail">
      <div className="section-title">
        <button className="link" onClick={onBack}>
          ← Hub
        </button>
        <button className="link" onClick={() => void load()} disabled={loading}>
          ↻ Atualizar
        </button>
      </div>
      {integration && connector && (
        <div className="detail-head">
          <span className="emoji big">{connector.emoji}</span>
          <div>
            <h2>{integration.name}</h2>
            <span className="muted">{connector.description}</span>
          </div>
        </div>
      )}
      <button className="primary" onClick={onChat}>
        💬 Perguntar ao Claude sobre este sistema
      </button>

      {loading && <p className="muted">Carregando dados…</p>}
      {error && <p className="error">{error}</p>}
      {overview && !loading && (
        <>
          <div className="metrics">
            {overview.metrics.map((m) => (
              <div key={m.label} className="metric" title={m.hint}>
                <span className="value">{m.value}</span>
                <span className="label">{m.label}</span>
              </div>
            ))}
          </div>
          {overview.tables.map((t) => (
            <div key={t.title} className="table-block">
              <h3>{t.title}</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, i) => (
                      <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
