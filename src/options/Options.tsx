import { useEffect, useState } from "react";
import { connectors, getConnector } from "../integrations/registry";
import type { Integration, IntegrationConfig } from "../integrations/types";
import { DEFAULT_SETTINGS, storage, type Effort, type Settings } from "../lib/storage";
import { useStored } from "../lib/useStorage";
import { webhookOrigin } from "../whatsapp/webhook";

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => void storage.getSettings().then(setSettings), []);

  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        if (settings.webhookUrl) {
          let origin: string;
          try {
            origin = webhookOrigin(settings.webhookUrl);
          } catch {
            setError("URL do webhook inválida.");
            return;
          }
          // Permissão de host só para a origem do webhook.
          if (!(await chrome.permissions.request({ origins: [origin] }))) {
            setError("Permissão para o webhook negada.");
            return;
          }
        }
        await storage.saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
    >
      <h2>Claude</h2>
      <label>
        Chave da API da Anthropic
        <input
          type="password"
          value={settings.apiKey}
          placeholder="sk-ant-..."
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
        />
        <small className="muted">Fica salva apenas neste navegador (chrome.storage.local).</small>
      </label>
      <label>
        Modelo
        <input value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} />
      </label>
      <label>
        Esforço (effort)
        <select value={settings.effort} onChange={(e) => setSettings({ ...settings, effort: e.target.value as Effort })}>
          {EFFORTS.map((ef) => (
            <option key={ef}>{ef}</option>
          ))}
        </select>
      </label>
      <h2>Conversas do WhatsApp</h2>
      <label>
        Webhook para o CRM
        <input
          type="url"
          value={settings.webhookUrl}
          placeholder="https://n8n.suaempresa.com/webhook/conversas"
          onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
        />
        <small className="muted">
          Recebe a análise em JSON (POST). Use n8n, Zapier ou Make para atualizar o CRM: nota, tarefa, health score.
        </small>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={settings.webhookIncluirMensagens}
          onChange={(e) => setSettings({ ...settings, webhookIncluirMensagens: e.target.checked })}
        />
        Enviar também a transcrição da conversa
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        {saved ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}

function IntegrationForm({ initial, onDone }: { initial?: Integration; onDone(): void }) {
  const [connectorId, setConnectorId] = useState(initial?.connectorId ?? connectors[0].id);
  const [name, setName] = useState(initial?.name ?? "");
  const [config, setConfig] = useState<IntegrationConfig>(initial?.config ?? {});
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();
  const connector = getConnector(connectorId);

  const save = async () => {
    // Pede permissão de host só para a origem do sistema cadastrado.
    const origins = connector.origins?.(config) ?? [];
    if (origins.length && !(await chrome.permissions.request({ origins }))) {
      setStatus({ ok: false, message: "Permissão de acesso ao sistema negada." });
      return;
    }
    const test = await connector.test(config);
    setStatus(test);
    if (!test.ok) return;
    const list = await storage.getIntegrations();
    const item: Integration = {
      id: initial?.id ?? crypto.randomUUID(),
      connectorId,
      name: name.trim() || connector.name,
      config,
      enabled: initial?.enabled ?? true,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    await storage.saveIntegrations(initial ? list.map((i) => (i.id === item.id ? item : i)) : [...list, item]);
    onDone();
  };

  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2>{initial ? `Editar ${initial.name}` : "Conectar sistema"}</h2>
      {!initial && (
        <div className="connector-picker">
          {connectors.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`connector ${c.id === connectorId ? "on" : ""}`}
              onClick={() => {
                setConnectorId(c.id);
                setConfig({});
                setStatus(undefined);
              }}
            >
              <span className="emoji">{c.emoji}</span>
              <strong>{c.name}</strong>
              <small className="muted">{c.description}</small>
            </button>
          ))}
        </div>
      )}
      <label>
        Nome no hub
        <input value={name} placeholder={connector.name} onChange={(e) => setName(e.target.value)} />
      </label>
      {connector.configFields.map((f) => (
        <label key={f.key}>
          {f.label}
          {f.type === "textarea" ? (
            <textarea
              rows={3}
              required={f.required}
              placeholder={f.placeholder}
              value={config[f.key] ?? ""}
              onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
            />
          ) : (
            <input
              type={f.type}
              required={f.required}
              placeholder={f.placeholder}
              value={config[f.key] ?? ""}
              onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
            />
          )}
          {f.help && <small className="muted">{f.help}</small>}
        </label>
      ))}
      {status && <p className={status.ok ? "success" : "error"}>{status.message}</p>}
      <div className="row">
        <button className="primary" type="submit">
          Testar e salvar
        </button>
        <button type="button" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function Options() {
  const integrations = useStored("integrations", storage.getIntegrations, []);
  const [editing, setEditing] = useState<Integration | "new">();

  const update = (list: Integration[]) => void storage.saveIntegrations(list);

  return (
    <div className="options">
      <header className="options-head">
        <span className="logo">🌹</span>
        <div>
          <h1>Quem Sabe Faz a Hora</h1>
          <p className="muted">“Vem, vamos embora, que esperar não é saber.”</p>
        </div>
      </header>

      <SettingsForm />

      <section className="panel">
        <div className="section-title">
          <h2>Sistemas integrados</h2>
          {!editing && (
            <button className="link" onClick={() => setEditing("new")}>
              + Conectar sistema
            </button>
          )}
        </div>
        {editing ? (
          <IntegrationForm initial={editing === "new" ? undefined : editing} onDone={() => setEditing(undefined)} />
        ) : integrations.length === 0 ? (
          <p className="muted">Nenhum sistema conectado. Comece pelo ERP de demonstração 🌹.</p>
        ) : (
          <ul className="cards">
            {integrations.map((i) => (
              <li key={i.id} className={`card ${i.enabled ? "" : "disabled"}`}>
                <span className="emoji">{getConnector(i.connectorId).emoji}</span>
                <div className="card-body">
                  <strong>{i.name}</strong>
                  <span className="muted">{getConnector(i.connectorId).name}</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={i.enabled}
                    onChange={() => update(integrations.map((x) => (x.id === i.id ? { ...x, enabled: !x.enabled } : x)))}
                  />
                  ativo
                </label>
                <button className="link" onClick={() => setEditing(i)}>
                  Editar
                </button>
                <button
                  className="link danger"
                  onClick={() => confirm(`Remover ${i.name}?`) && update(integrations.filter((x) => x.id !== i.id))}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
