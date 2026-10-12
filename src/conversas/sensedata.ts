import type { AnalysisRecord, SensedataConfig } from "../lib/storage";
import { mesmoTelefone, nacional, variantes } from "./phone";
import { resumoTexto, tituloCurto } from "./resumo";

/**
 * Cliente da API SenseConnect v2 (https://api.sensedata.io/v2/redoc).
 * Autenticação: cabeçalho `Authorization: Bearer <token>`.
 */

export interface SdContato {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  phone2?: string;
  id_customer: number;
  is_active?: boolean;
}

interface SdErro {
  errors?: { code?: string; type?: string; message?: string }[];
}

async function sd<T>(cfg: SensedataConfig, path: string, init?: RequestInit): Promise<T> {
  if (!cfg.token) throw new Error("Configure o token do Sensedata nas opções da extensão.");
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & SdErro;
  if (!res.ok) {
    const msg = body.errors?.map((e) => e.message).filter(Boolean).join("; ") || res.statusText;
    throw new Error(`Sensedata ${res.status}: ${msg}`);
  }
  return body;
}

const qs = (params: Record<string, string | string[] | number>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) for (const item of [v].flat()) u.append(k, String(item));
  return u.toString();
};

/** Data local no formato AAAA-MM-DD. */
const hoje = () => new Date().toLocaleDateString("sv-SE");
/** Data e hora local, sem fuso: "2026-10-12T09:30:00". */
const agoraLocal = () => new Date().toLocaleString("sv-SE").replace(" ", "T");

/* ---------- consultas ---------- */

export const sensedata = {
  me: (cfg: SensedataConfig) => sd<{ name: string; tenant: string; username: string }>(cfg, "/v2/me"),

  async tiposAtividade(cfg: SensedataConfig) {
    const r = await sd<{ tasks_types: { description: string; caption?: string; enabled?: boolean }[] }>(cfg, "/v2/tasks_types");
    return r.tasks_types.filter((t) => t.enabled !== false);
  },
  async statusAtividade(cfg: SensedataConfig) {
    return (await sd<{ tasks_status: { description: string }[] }>(cfg, "/v2/tasks_status")).tasks_status;
  },
  async prioridades(cfg: SensedataConfig) {
    return (await sd<{ tasks_priorities: { description: string }[] }>(cfg, "/v2/tasks_priorities")).tasks_priorities;
  },
  async tiposDado(cfg: SensedataConfig) {
    return (await sd<{ custom_data_types: string[] }>(cfg, "/v2/custom_data_types")).custom_data_types;
  },

  /**
   * Localiza o contato pelo telefone (campos `phone` e `phone2`) ou pelo
   * e-mail. Tenta primeiro a busca exata de /v2/contacts com as formas
   * comuns do número; se nada vier, usa a busca parcial /v2/search. Todo
   * candidato é conferido aqui antes de ser aceito.
   */
  async localizarContato(cfg: SensedataConfig, identificador: string): Promise<SdContato[]> {
    const isEmail = identificador.includes("@");
    const confere = (c: Partial<SdContato>) =>
      isEmail
        ? c.email?.toLowerCase() === identificador.toLowerCase()
        : mesmoTelefone(c.phone, identificador) || mesmoTelefone(c.phone2, identificador);

    const achados = new Map<number, SdContato>();
    const add = (list: SdContato[]) => list.filter(confere).forEach((c) => achados.set(c.id, c));

    if (isEmail) {
      add((await sd<{ contacts: SdContato[] }>(cfg, `/v2/contacts?${qs({ email: identificador, limit: 20 })}`)).contacts);
    } else {
      const formas = variantes(identificador);
      for (const campo of ["phone", "phone2"]) {
        add((await sd<{ contacts: SdContato[] }>(cfg, `/v2/contacts?${qs({ [campo]: formas, limit: 20 })}`)).contacts);
      }
    }

    if (!achados.size) {
      // Busca parcial: e-mail inteiro, ou os 8 últimos dígitos (com e sem hífen).
      const termos = isEmail ? [identificador] : [nacional(identificador).slice(-8), nacional(identificador).slice(-8).replace(/(\d{4})$/, "-$1")];
      for (const string of termos) {
        const r = await sd<{ search: SdContato[] }>(cfg, `/v2/search?${qs({ string, type: "contatos", limit: 50 })}`);
        add(r.search);
      }
    }

    // Ativos primeiro.
    return [...achados.values()].sort((a, b) => Number(b.is_active !== false) - Number(a.is_active !== false));
  },

  /* ---------- envios ---------- */

  /** Registra a análise como atividade (POST /v2/tasks), já concluída. */
  async criarAtividade(cfg: SensedataConfig, r: AnalysisRecord, contato: SdContato) {
    if (!cfg.responsavel || !cfg.tipoAtividade || !cfg.statusAtividade || !cfg.prioridadeAtividade) {
      throw new Error("Complete responsável, tipo, status e prioridade da atividade nas opções.");
    }
    const task = {
      // id_legacy fixo por conversa: reenviar atualiza a mesma atividade.
      id_legacy: `fazahora-${r.id}`,
      customer: { id: contato.id_customer },
      contact: { id: contato.id },
      description: tituloCurto(r, contato.name),
      start_date: hoje(),
      due_date: hoje(),
      type: { description: cfg.tipoAtividade },
      status: { description: cfg.statusAtividade },
      priority: { description: cfg.prioridadeAtividade },
      owner: { email: cfg.responsavel },
      notes: resumoTexto(r, contato.name),
      tags: ["faz-a-hora", r.conversa.canal, `risco-${r.analise.risco_cancelamento.nivel}`].join(","),
    };
    return sd(cfg, "/v2/tasks", { method: "POST", body: JSON.stringify({ tasks: [task] }) });
  },

  /** Grava a análise como dado customizado (POST /v2/custom_data). */
  async gravarDadoCustomizado(cfg: SensedataConfig, r: AnalysisRecord, contato: SdContato) {
    if (!cfg.tipoDado) throw new Error("Informe o tipo do dado customizado nas opções.");
    const a = r.analise;
    const item = {
      id_legacy: `fazahora-${r.id}`,
      customer: { id: contato.id_customer },
      ref_date: hoje(),
      type: cfg.tipoDado,
      data: {
        canal: r.conversa.canal,
        contato_id: contato.id,
        contato_nome: contato.name,
        assunto: r.conversa.assunto ?? "",
        mensagens: r.conversa.mensagens.length,
        sentimento: a.sentimento.geral,
        score_sentimento: a.sentimento.score,
        satisfacao: a.satisfacao.nota,
        risco_cancelamento: a.risco_cancelamento.nivel,
        motivos_cancelamento: a.risco_cancelamento.motivos.join("; "),
        oportunidade_venda: a.oportunidade_venda.nivel,
        upsell: a.upsell.nivel,
        upsell_sugestao: a.upsell.sugestao,
        emocoes: a.emocoes.join(", "),
        objecoes: a.objecoes.join("; "),
        resumo: a.resumo,
        proxima_acao: a.proxima_acao,
        analisado_em: r.analisadoEm,
      },
    };
    return sd(cfg, "/v2/custom_data", { method: "POST", body: JSON.stringify({ custom_data: [item] }) });
  },

  /** Anexa a análise como nota do cliente (POST /v2/customers_notes). */
  async criarNota(cfg: SensedataConfig, r: AnalysisRecord, contato: SdContato) {
    const nota = {
      id_legacy: `fazahora-${r.id}`,
      customer: { id: contato.id_customer },
      description: resumoTexto(r, contato.name),
      created_on: agoraLocal(),
    };
    return sd(cfg, "/v2/customers_notes", { method: "POST", body: JSON.stringify({ customers_notes: [nota] }) });
  },
};
