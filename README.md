# 🌹 Quem Sabe Faz a Hora

> *"Vem, vamos embora, que esperar não é saber,
> quem sabe faz a hora, não espera acontecer."*
> Geraldo Vandré, **Pra Não Dizer Que Não Falei das Flores** (1968)

Extensão do Google Chrome (Manifest V3) que funciona como **hub de integração entre sistemas**. Ela traz um **chat com o Claude no painel lateral** para conversar sobre os sistemas integrados, cruzar dados entre eles e consultar informações específicas de cada um.

## Funcionalidades

- **Hub de sistemas**: lista os sistemas conectados. Ao abrir um deles você vê métricas e tabelas com dados ao vivo.
- **Chat com o Claude** no Side Panel, que acompanha você em qualquer aba:
  - escolha quais sistemas entram no contexto (chips no topo do chat);
  - o Claude **consulta os sistemas por conta própria** via *tool use* (cada conector expõe ferramentas);
  - opção **📄 Página atual**: o texto da aba ativa entra no contexto;
  - respostas em streaming, com histórico salvo localmente.
- **Conectores incluídos**:
  | Conector | Para quê |
  |---|---|
  | 🌹 ERP de demonstração | Dados fictícios de clientes e pedidos para testar sem credenciais |
  | 🐙 GitHub | Repositórios, issues e pull requests |
  | 🔌 API REST genérica | Qualquer sistema com API JSON (CRM, ERP, helpdesk, sistemas internos) |

## Arquitetura

```
┌──────────────────────┐   chrome.runtime.connect   ┌───────────────────────────┐   HTTPS (streaming)
│  Side Panel (React)  │ ─────────────────────────▶ │  Service Worker           │ ─────────────────▶ API da Anthropic
│  Hub · Detalhe · Chat│ ◀──── eventos (delta,      │  loop do Claude + tools   │
└─────────┬────────────┘       tool, done, error)   │  executa os conectores    │ ─────────────────▶ APIs dos sistemas
          │ chrome.tabs.sendMessage                 └───────────────────────────┘
          ▼
┌──────────────────────┐
│  Content Script      │  extrai o texto da página ativa
└──────────────────────┘
```

| Peça | Arquivo | Papel |
|---|---|---|
| Manifesto | `manifest.config.ts` | Permissões (`sidePanel`, `storage`, `scripting`...), painel lateral, service worker, content script |
| Painel lateral | `src/sidepanel/` | Interface do hub e do chat |
| Service worker | `src/background/` | Fala com a API do Claude (streaming + loop de ferramentas) e executa os conectores |
| Content script | `src/content/` | Lê o texto da página atual quando o chat pede |
| Opções | `src/options/` | Chave da API, modelo, esforço e cadastro dos sistemas |
| Conectores | `src/integrations/` | Contrato `Connector` e implementações |

### Fluxo de uma pergunta

1. Você digita no painel e envia.
2. Se **📄 Página atual** estiver ativo, o painel pede o texto da aba ao content script.
3. O painel envia pergunta + sistemas em foco + página para o service worker.
4. O service worker chama a API do Claude com as ferramentas dos sistemas em foco.
5. Quando o Claude pede uma ferramenta (ex.: `listar_pedidos`), o service worker consulta o sistema e devolve o resultado. Isso se repete até a resposta final.
6. O texto chega em streaming ao painel, e a conversa é salva em `chrome.storage.local`.

## Começando

```bash
npm install
npm run build        # gera dist/
```

1. Abra `chrome://extensions`, ative o **Modo do desenvolvedor** e clique em **Carregar sem compactação**, apontando para `dist/`.
2. Clique no ícone 🌹: o painel lateral abre.
3. Em **⚙ Configurações**, informe sua chave da API da Anthropic e conecte o **ERP de demonstração**.
4. Vá ao **Chat** e pergunte: *"Quais pedidos estão atrasados e de quais clientes?"*

Para desenvolvimento com recarga automática: `npm run dev` e carregue `dist/` da mesma forma.

## Criando um novo conector

Implemente a interface `Connector` (`src/integrations/types.ts`) e registre em `src/integrations/registry.ts`:

```ts
export const meuSistema: Connector = {
  id: "meu-sistema",
  name: "Meu Sistema",
  description: "O que ele faz",
  emoji: "✊",
  configFields: [{ key: "token", label: "Token", type: "password", required: true }],
  origins: () => ["https://api.meusistema.com/*"],  // permissão pedida em tempo de execução
  test: async (config) => ({ ok: true, message: "Conectado" }),
  overview: async (config) => ({ metrics: [...], tables: [...] }),  // o que aparece no hub
  tools: [ /* ferramentas que o Claude pode chamar */ ],
};
```

## Segurança

- A chave da API fica **apenas** no `chrome.storage.local` do navegador. A extensão chama a API da Anthropic diretamente do service worker, sem servidor intermediário.
- Para uso em equipe ou produção, o recomendado é colocar um **backend próprio** entre a extensão e a API. Assim a chave sai do navegador e você ganha controle de acesso e auditoria.
- Sistemas REST pedem permissão de host **só para a origem cadastrada**, no momento do cadastro (`optional_host_permissions`).
- O conector REST só faz `GET` e recusa caminhos fora da URL base.

## Roadmap

- [ ] Backend/proxy opcional para a chave da API e autenticação da equipe
- [ ] Conectores para Jira, Slack, Google Sheets e bancos via API
- [ ] Ações de escrita com confirmação explícita do usuário
- [ ] Múltiplas conversas e busca no histórico
- [ ] Servidores MCP como fonte de conectores

---

*Caminhando e cantando e seguindo a canção.* ✊🌹
