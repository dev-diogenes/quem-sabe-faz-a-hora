import type { Connector, IntegrationConfig } from "../types";

/**
 * Conector genérico para qualquer API REST/JSON. Permite plugar sistemas
 * internos sem escrever código: basta a URL base, um cabeçalho de
 * autenticação e (opcionalmente) os endpoints que alimentam o painel.
 */

function baseUrl(config: IntegrationConfig): URL {
  return new URL(config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`);
}

async function get(config: IntegrationConfig, path: string): Promise<unknown> {
  const url = new URL(path.replace(/^\//, ""), baseUrl(config));
  if (url.origin !== baseUrl(config).origin) throw new Error("Caminho fora da URL base do sistema.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.authHeader && config.authValue) headers[config.authHeader] = config.authValue;
  const res = await fetch(url, { headers });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const endpoints = (config: IntegrationConfig) =>
  (config.endpoints ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function toTable(title: string, data: unknown) {
  const items = Array.isArray(data) ? data : [data];
  const objects = items.filter((i): i is Record<string, unknown> => !!i && typeof i === "object");
  const columns = [...new Set(objects.flatMap((o) => Object.keys(o)))].slice(0, 6);
  return {
    title,
    columns,
    rows: objects.slice(0, 20).map((o) =>
      columns.map((c) => {
        const v = o[c];
        return typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      }),
    ),
  };
}

export const restConnector: Connector = {
  id: "rest",
  name: "API REST genérica",
  description: "Qualquer sistema com API JSON: CRM, ERP, helpdesk, sistemas internos.",
  emoji: "🔌",
  configFields: [
    { key: "baseUrl", label: "URL base", type: "url", placeholder: "https://api.meusistema.com/v1", required: true },
    { key: "authHeader", label: "Cabeçalho de autenticação", type: "text", placeholder: "Authorization" },
    { key: "authValue", label: "Valor do cabeçalho", type: "password", placeholder: "Bearer ..." },
    {
      key: "endpoints",
      label: "Endpoints do painel",
      type: "textarea",
      placeholder: "/clientes\n/pedidos?status=aberto",
      help: "Um por linha. São exibidos no hub e informados ao Claude como ponto de partida.",
    },
  ],
  origins(config) {
    return config.baseUrl ? [`${baseUrl(config).origin}/*`] : [];
  },
  async test(config) {
    try {
      await get(config, endpoints(config)[0] ?? "");
      return { ok: true, message: "Sistema respondeu." };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  async overview(config) {
    const eps = endpoints(config);
    const results = await Promise.all(eps.map((ep) => get(config, ep)));
    return {
      metrics: eps.map((ep, i) => ({
        label: ep,
        value: Array.isArray(results[i]) ? (results[i] as unknown[]).length : "1",
        hint: "registros",
      })),
      tables: eps.map((ep, i) => toTable(ep, results[i])),
    };
  },
  tools: [
    {
      name: "consultar",
      description:
        "Faz um GET em um caminho relativo da API do sistema (ex.: /clientes?ativo=true) e devolve o JSON.",
      input_schema: {
        type: "object",
        properties: { caminho: { type: "string", description: "Caminho relativo à URL base." } },
        required: ["caminho"],
      },
      async run(config, input) {
        return get(config, String(input.caminho));
      },
    },
  ],
};
