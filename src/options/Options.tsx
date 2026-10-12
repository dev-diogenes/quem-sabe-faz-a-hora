import { useEffect, useState } from "react";
import { connectors, getConnector } from "../integrations/registry";
import type { Integration, IntegrationConfig } from "../integrations/types";
import { DEFAULT_SETTINGS, storage, type Destino, type Effort, type Settings } from "../lib/storage";
import { sensedata } from "../conversas/sensedata";
import { useStored } from "../lib/useStorage";
import { Carnation, ConnectorIcon } from "../sidepanel/Icons";
import { webhookOrigin } from "../conversas/webhook";

const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

interface Opcoes {
  tipos: string[];
  status: string[];
  prioridades: string[];
  tiposDado: string[];
}

/** Configuração do Sensedata: token, responsável e o que gravar em cada destino. */
function SensedataSection({ settings, onChange }: { settings: Settings; onChange(s: Settings): void }) {
  const sd = settings.sensedata;
  const set = (patch: Partial<Settings["sensedata"]>) => onChange({ ...settings, sensedata: { ...sd, ...patch } });
  const [opcoes, setOpcoes] = useState<Opcoes>();
  const [status, setStatus] = useState<{ ok: boolean; message: string }>();

  const conectar = async () => {
    setStatus(undefined);
    try {
      const me = await sensedata.me(sd);
      const [tipos, st, prio, tiposDado] = await Promise.all([
        sensedata.tiposAtividade(sd),
        sensedata.statusAtividade(sd),
        sensedata.prioridades(sd),
        sensedata.tiposDado(sd),
      ]);
      setOpcoes({
        tipos: tipos.map((t) => t.description),
        status: st.map((t) => t.description),
        prioridades: prio.map((t) => t.description),
        tiposDado,
      });
      setStatus({ ok: true, message: `Conectado a ${me.name} (${me.tenant}) como ${me.username}.` });
    } catch (e) {
      setStatus({ ok: false, message: String(e instanceof Error ? e.message : e) });
    }
  };

  // Campo de lista quando as opções foram carregadas; texto livre antes disso.
  const escolha = (props: { label: string; value: string; options?: string[]; onPick(v: string): void; help?: string }) => (
    <label>
      {props.label}
      {props.options ? (
        <select value={props.value} onChange={(e) => props.onPick(e.target.value)}>
          <option value="">Selecione…</option>
          {props.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input value={props.value} onChange={(e) => props.onPick(e.target.value)} placeholder="Conecte para listar as opções" />
      )}
      {props.help && <small className="muted">{props.help}</small>}
    </label>
  );

  return (
    <>
      <h2>Sensedata</h2>
      <label>
        Token da API (SenseConnect)
        <input type="password" value={sd.token} onChange={(e) => set({ token: e.target.value })} placeholder="Gerenciador de chave de API" />
        <small className="muted">
          O contato é localizado pelos campos <b>phone</b> e <b>phone2</b> (WhatsApp) ou <b>email</b> (Gmail).
        </small>
      </label>
      <div className="row">
        <button type="button" onClick={() => void conectar()} disabled={!sd.token}>
          Conectar e carregar opções
        </button>
      </div>
      {status && <p className={status.ok ? "success" : "error"}>{status.message}</p>}

      <h3>Atividade</h3>
      <label>
        E-mail do responsável no Sensedata
        <input type="email" value={sd.responsavel} onChange={(e) => set({ responsavel: e.target.value })} placeholder="voce@empresa.com" />
      </label>
      <div className="grid-3">
        {escolha({ label: "Tipo", value: sd.tipoAtividade, options: opcoes?.tipos, onPick: (v) => set({ tipoAtividade: v }), })}
        {escolha({ label: "Status", value: sd.statusAtividade, options: opcoes?.status, onPick: (v) => set({ statusAtividade: v }), })}
        {escolha({ label: "Prioridade", value: sd.prioridadeAtividade, options: opcoes?.prioridades, onPick: (v) => set({ prioridadeAtividade: v }), })}
      </div>

      <h3>Dado customizado</h3>
      <label>
        Tipo (tabela) do dado customizado
        <input list="tipos-dado" value={sd.tipoDado} onChange={(e) => set({ tipoDado: e.target.value })} />
        <datalist id="tipos-dado">
          {opcoes?.tiposDado.map((t) => <option key={t} value={t} />)}
        </datalist>
        <small className="muted">Cada análise vira uma linha desse tipo no cliente, com sentimento, satisfação, riscos e resumo.</small>
      </label>
    </>
  );
}

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
      <SensedataSection settings={settings} onChange={setSettings} />

      <h2>Webhook (opcional)</h2>
      <label>
        URL do webhook
        <input
          type="url"
          value={settings.webhookUrl}
          placeholder="https://n8n.suaempresa.com/webhook/conversas"
          onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
        />
        <small className="muted">Recebe a análise em JSON (POST), para n8n, Zapier ou Make.</small>
      </label>
      <label className="switch">
        <input
          type="checkbox"
          checked={settings.webhookIncluirMensagens}
          onChange={(e) => setSettings({ ...settings, webhookIncluirMensagens: e.target.checked })}
        />
        Enviar também a transcrição da conversa
      </label>
      <label>
        Destino padrão das análises
        <select value={settings.destinoPadrao} onChange={(e) => setSettings({ ...settings, destinoPadrao: e.target.value as Destino })}>
          <option value="sd_atividade">Sensedata · Atividade</option>
          <option value="sd_dados">Sensedata · Dado customizado</option>
          <option value="sd_nota">Sensedata · Nota do cliente</option>
          <option value="webhook">Webhook</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" type="submit">
        {saved ? "Salvo" : "Salvar"}
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
              <ConnectorIcon id={c.id} />
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
        <Carnation size={44} />
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
          <p className="muted">Nenhum sistema conectado. Comece pelo ERP de demonstração.</p>
        ) : (
          <ul className="cards">
            {integrations.map((i) => (
              <li key={i.id} className={`card ${i.enabled ? "" : "disabled"}`}>
                <ConnectorIcon id={i.connectorId} />
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
