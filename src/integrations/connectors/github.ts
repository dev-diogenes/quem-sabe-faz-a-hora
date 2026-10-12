import type { Connector, IntegrationConfig } from "../types";

const API = "https://api.github.com";

async function gh<T>(config: IntegrationConfig, path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Repo {
  full_name: string;
  open_issues_count: number;
  stargazers_count: number;
  pushed_at: string;
  private: boolean;
}

interface Issue {
  number: number;
  title: string;
  state: string;
  user: { login: string };
  pull_request?: unknown;
  html_url: string;
  created_at: string;
}

const repoList = (config: IntegrationConfig) =>
  (config.repos ?? "")
    .split(/[\s,]+/)
    .map((r) => r.trim())
    .filter(Boolean);

export const githubConnector: Connector = {
  id: "github",
  name: "GitHub",
  description: "Repositórios, issues e pull requests.",
  configFields: [
    {
      key: "token",
      label: "Token de acesso",
      type: "password",
      help: "Fine-grained token com leitura de issues e pull requests. Opcional para repositórios públicos.",
    },
    {
      key: "repos",
      label: "Repositórios",
      type: "textarea",
      placeholder: "dono/repo, outro-dono/outro-repo",
      required: true,
    },
  ],
  async test(config) {
    const repos = repoList(config);
    if (!repos.length) return { ok: false, message: "Informe ao menos um repositório." };
    try {
      await gh(config, `/repos/${repos[0]}`);
      return { ok: true, message: `Conectado a ${repos[0]}.` };
    } catch (e) {
      return { ok: false, message: String(e) };
    }
  },
  async overview(config) {
    const repos = await Promise.all(repoList(config).map((r) => gh<Repo>(config, `/repos/${r}`)));
    return {
      metrics: [
        { label: "Repositórios", value: repos.length },
        { label: "Issues + PRs abertos", value: repos.reduce((t, r) => t + r.open_issues_count, 0) },
        { label: "Estrelas", value: repos.reduce((t, r) => t + r.stargazers_count, 0) },
      ],
      tables: [
        {
          title: "Repositórios",
          columns: ["Repositório", "Abertos", "Último push"],
          rows: repos.map((r) => [
            r.full_name,
            r.open_issues_count,
            new Date(r.pushed_at).toLocaleString("pt-BR"),
          ]),
        },
      ],
    };
  },
  tools: [
    {
      name: "listar_issues",
      description:
        "Lista issues e pull requests de um repositório GitHub configurado. Use state=open|closed|all.",
      input_schema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "No formato dono/repo." },
          state: { type: "string", enum: ["open", "closed", "all"] },
        },
        required: ["repo"],
      },
      async run(config, input) {
        const repo = String(input.repo);
        if (!repoList(config).includes(repo)) {
          throw new Error(`Repositório ${repo} não está configurado nesta integração.`);
        }
        const state = typeof input.state === "string" ? input.state : "open";
        const issues = await gh<Issue[]>(config, `/repos/${repo}/issues?state=${state}&per_page=30`);
        return issues.map((i) => ({
          numero: i.number,
          titulo: i.title,
          tipo: i.pull_request ? "pull request" : "issue",
          estado: i.state,
          autor: i.user.login,
          criado_em: i.created_at,
          url: i.html_url,
        }));
      },
    },
  ],
};
