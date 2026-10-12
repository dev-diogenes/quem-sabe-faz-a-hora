import type { Connector } from "../types";

/**
 * Sistema fictício para experimentar o hub sem credenciais: um pequeno ERP
 * de uma cooperativa de flores. Todos os dados são locais.
 */

const clientes = [
  { id: 1, nome: "Cooperativa Girassol", cidade: "Recife", status: "ativo" },
  { id: 2, nome: "Feira da Praça", cidade: "São Paulo", status: "ativo" },
  { id: 3, nome: "Floricultura Canção", cidade: "Belo Horizonte", status: "inadimplente" },
  { id: 4, nome: "Jardim do Povo", cidade: "Porto Alegre", status: "ativo" },
];

const pedidos = [
  { id: 101, clienteId: 1, item: "Cravos vermelhos", qtd: 300, valor: 1500, status: "entregue" },
  { id: 102, clienteId: 2, item: "Girassóis", qtd: 120, valor: 960, status: "em trânsito" },
  { id: 103, clienteId: 3, item: "Rosas brancas", qtd: 80, valor: 720, status: "atrasado" },
  { id: 104, clienteId: 4, item: "Margaridas", qtd: 200, valor: 800, status: "separando" },
  { id: 105, clienteId: 1, item: "Ipês (mudas)", qtd: 15, valor: 1350, status: "atrasado" },
];

const nomeCliente = (id: number) => clientes.find((c) => c.id === id)?.nome ?? `#${id}`;

export const demoConnector: Connector = {
  id: "demo",
  name: "ERP de demonstração",
  description: "Sistema fictício com clientes e pedidos, para testar o hub sem credenciais.",
  emoji: "🌹",
  configFields: [],
  async test() {
    return { ok: true, message: "Sistema de demonstração sempre disponível." };
  },
  async overview() {
    const faturamento = pedidos.reduce((t, p) => t + p.valor, 0);
    return {
      metrics: [
        { label: "Clientes", value: clientes.length },
        { label: "Pedidos", value: pedidos.length },
        { label: "Atrasados", value: pedidos.filter((p) => p.status === "atrasado").length },
        { label: "Faturamento", value: `R$ ${faturamento.toLocaleString("pt-BR")}` },
      ],
      tables: [
        {
          title: "Pedidos",
          columns: ["#", "Cliente", "Item", "Status", "Valor"],
          rows: pedidos.map((p) => [p.id, nomeCliente(p.clienteId), p.item, p.status, `R$ ${p.valor}`]),
        },
      ],
    };
  },
  tools: [
    {
      name: "listar_clientes",
      description: "Lista os clientes do ERP, opcionalmente filtrando por status (ativo, inadimplente).",
      input_schema: {
        type: "object",
        properties: { status: { type: "string", description: "Filtro opcional de status." } },
      },
      async run(_config, input) {
        const status = typeof input.status === "string" ? input.status : undefined;
        return status ? clientes.filter((c) => c.status === status) : clientes;
      },
    },
    {
      name: "listar_pedidos",
      description:
        "Lista pedidos do ERP com nome do cliente. Filtros opcionais: status (entregue, em trânsito, atrasado, separando) e cliente_id.",
      input_schema: {
        type: "object",
        properties: {
          status: { type: "string" },
          cliente_id: { type: "number" },
        },
      },
      async run(_config, input) {
        return pedidos
          .filter((p) => (typeof input.status === "string" ? p.status === input.status : true))
          .filter((p) => (typeof input.cliente_id === "number" ? p.clienteId === input.cliente_id : true))
          .map((p) => ({ ...p, cliente: nomeCliente(p.clienteId) }));
      },
    },
  ],
};
