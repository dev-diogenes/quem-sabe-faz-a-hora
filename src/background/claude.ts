import Anthropic from "@anthropic-ai/sdk";
import { getConnector } from "../integrations/registry";
import type { ConnectorTool, Integration } from "../integrations/types";
import type { ChatEvent, ChatRequest } from "../lib/messages";
import { storage, type DisplayMessage } from "../lib/storage";

const MAX_TOOL_ROUNDS = 8;
const MAX_TOOL_RESULT_CHARS = 20_000;

const SYSTEM_PROMPT = `Você é o assistente do hub "Quem Sabe Faz a Hora", uma extensão do Chrome que integra vários sistemas de uma organização.

Seu papel:
- Responder perguntas sobre os sistemas integrados e cruzar dados entre eles.
- Usar as ferramentas disponíveis para buscar dados reais antes de afirmar algo sobre um sistema. Cada ferramenta tem o nome do sistema na descrição.
- Quando o usuário compartilhar a página atual, usá-la como contexto adicional.
- Ser direto e objetivo, em português do Brasil, com listas e tabelas em Markdown quando ajudarem.
- Se um dado não estiver disponível nas ferramentas, dizer isso claramente em vez de supor.`;

/** Mapeia o nome exposto ao Claude para a integração + ferramenta reais. */
interface BoundTool {
  integration: Integration;
  tool: ConnectorTool;
  def: Anthropic.Beta.BetaTool;
}

function bindTools(integrations: Integration[]): Map<string, BoundTool> {
  const bound = new Map<string, BoundTool>();
  integrations.forEach((integration, i) => {
    const connector = getConnector(integration.connectorId);
    for (const tool of connector.tools) {
      // Nomes de ferramentas aceitam apenas [a-zA-Z0-9_-]{1,64}.
      const name = `s${i}_${tool.name}`.slice(0, 64);
      bound.set(name, {
        integration,
        tool,
        def: {
          name,
          description: `[Sistema: ${integration.name} (${connector.name})] ${tool.description}`,
          input_schema: tool.input_schema,
        },
      });
    }
  });
  return bound;
}

function buildUserContent(req: ChatRequest, integrations: Integration[]): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (integrations.length) {
    const lista = integrations
      .map((i) => `- ${i.name} (${getConnector(i.connectorId).name})`)
      .join("\n");
    blocks.push({ type: "text", text: `<sistemas_em_foco>\n${lista}\n</sistemas_em_foco>` });
  }
  if (req.page) {
    blocks.push({
      type: "text",
      text: `<pagina_atual url="${req.page.url}" titulo="${req.page.title}">\n${req.page.text}\n</pagina_atual>`,
    });
  }
  blocks.push({ type: "text", text: req.text });
  return blocks;
}

async function runTool(bound: BoundTool | undefined, input: unknown): Promise<{ content: string; isError: boolean }> {
  if (!bound) return { content: "Ferramenta desconhecida.", isError: true };
  try {
    const result = await bound.tool.run(bound.integration.config, (input ?? {}) as Record<string, unknown>);
    const json = JSON.stringify(result, null, 2) ?? "null";
    return {
      content: json.length > MAX_TOOL_RESULT_CHARS ? `${json.slice(0, MAX_TOOL_RESULT_CHARS)}\n…(resultado truncado)` : json,
      isError: false,
    };
  } catch (e) {
    return { content: `Erro ao consultar ${bound.integration.name}: ${String(e)}`, isError: true };
  }
}

export async function runChatTurn(req: ChatRequest, emit: (e: ChatEvent) => void): Promise<void> {
  const settings = await storage.getSettings();
  if (!settings.apiKey) {
    emit({ type: "error", message: "Configure sua chave da API da Anthropic nas opções da extensão." });
    emit({ type: "done" });
    return;
  }

  const all = await storage.getIntegrations();
  const enabled = all.filter((i) => i.enabled);
  const focused = req.integrationIds.length ? enabled.filter((i) => req.integrationIds.includes(i.id)) : enabled;
  const tools = bindTools(focused);

  const conversation = await storage.getConversation();
  conversation.api.push({ role: "user", content: buildUserContent(req, focused) });
  conversation.display.push({
    role: "user",
    text: req.text,
    context: [...focused.map((i) => i.name), ...(req.page ? [`📄 ${req.page.title}`] : [])],
  });
  const reply: DisplayMessage = { role: "assistant", text: "", tools: [] };
  conversation.display.push(reply);
  await storage.saveConversation(conversation);

  // A chave fica só no storage local do usuário; a extensão fala direto com a API.
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = client.beta.messages.stream({
        model: settings.model,
        max_tokens: 64000,
        output_config: { effort: settings.effort },
        // Se o modelo recusar por política, a API refaz o pedido num modelo
        // de fallback adequado dentro da mesma chamada.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        system: SYSTEM_PROMPT,
        tools: [...tools.values()].map((t) => t.def),
        messages: conversation.api,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          reply.text += event.delta.text;
          emit({ type: "delta", text: event.delta.text });
        }
      }
      const message = await stream.finalMessage();
      // Histórico só cresce: o conteúdo completo (inclusive thinking) volta igual.
      conversation.api.push({ role: "assistant", content: message.content });

      if (message.stop_reason === "refusal") {
        reply.error = "O modelo recusou esta solicitação.";
        emit({ type: "error", message: reply.error });
        break;
      }
      if (message.stop_reason !== "tool_use") break;

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      const calls = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      await Promise.all(
        calls.map(async (call) => {
          const bound = tools.get(call.name);
          const activity = {
            name: bound?.tool.name ?? call.name,
            system: bound?.integration.name ?? "?",
            status: "running" as const,
          };
          reply.tools!.push(activity);
          emit({ type: "tool", ...activity });
          const { content, isError } = await runTool(bound, call.input);
          const status = isError ? "error" : "ok";
          Object.assign(activity, { status });
          emit({ type: "tool", name: activity.name, system: activity.system, status });
          results.push({ type: "tool_result", tool_use_id: call.id, content, is_error: isError });
        }),
      );
      // Todos os resultados vão juntos numa única mensagem de usuário.
      conversation.api.push({ role: "user", content: results });
      reply.text += reply.text && !reply.text.endsWith("\n") ? "\n\n" : "";
      await storage.saveConversation(conversation);
    }
  } catch (e) {
    reply.error = describeError(e);
    emit({ type: "error", message: reply.error });
  } finally {
    await storage.saveConversation(conversation);
    emit({ type: "done" });
  }
}

function describeError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Chave da API inválida. Verifique as opções da extensão.";
  if (e instanceof Anthropic.RateLimitError) return "Limite de requisições atingido. Tente novamente em instantes.";
  if (e instanceof Anthropic.BadRequestError) return `Requisição inválida: ${e.message}`;
  if (e instanceof Anthropic.APIError) return `Erro da API (${e.status}): ${e.message}`;
  return String(e);
}
