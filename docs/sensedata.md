# Integração com o Sensedata

A extensão leva a análise de cada conversa (WhatsApp ou thread do Gmail) para o Sensedata pela API **SenseConnect v2** ([documentação](https://api.sensedata.io/v2/redoc)). Autenticação: cabeçalho `Authorization: Bearer <token>`. O token é gerado em *SenseConnect › Gerenciador de chave de API*.

Código: `src/conversas/sensedata.ts`.

## 1. Localizar o contato

| Canal | Chave | Como busca |
|---|---|---|
| WhatsApp | Telefone do chat, lido do WhatsApp Web | `GET /v2/contacts?phone=…` e `GET /v2/contacts?phone2=…`, com as formas comuns do número (`+55…`, `55…`, só DDD+número, com e sem o nono dígito) |
| Gmail | E-mail do cliente na thread | `GET /v2/contacts?email=…` |

Se a busca exata não achar nada, a extensão tenta a busca parcial `GET /v2/search?type=contatos` (os 8 últimos dígitos ou o e-mail). Todo candidato é conferido na extensão: o telefone precisa bater com `phone` ou `phone2` (tolerando formatação, `+55` e o nono dígito), ou o e-mail precisa ser igual. Havendo mais de um, o usuário escolhe; contatos ativos aparecem primeiro.

## 2. Destinos

Todos usam `id_legacy = fazahora-<id da conversa>`. Por isso, reenviar a mesma análise **atualiza** o registro em vez de duplicar.

### Atividade: `POST /v2/tasks`
Atividade no cliente e no contato, com data de hoje.
- `description`: título curto, ex.: "WhatsApp · Maria Souza · risco de cancelamento alto".
- `notes`: a análise completa em texto (sentimento, satisfação, riscos, resumo, próxima ação e mensagem sugerida).
- `type`, `status` e `priority` vêm, pela descrição, das opções da sua conta. A tela de opções lista os valores com `/v2/tasks_types`, `/v2/tasks_status` e `/v2/tasks_priorities`.
- `owner`: pelo e-mail do responsável configurado.
- `tags`: `faz-a-hora,<canal>,risco-<nível>`.

### Dado customizado: `POST /v2/custom_data`
Uma linha por conversa no tipo configurado (padrão `analise_conversa`), com `ref_date` de hoje e `data` contendo:
`canal, contato_id, contato_nome, assunto, mensagens, sentimento, score_sentimento, satisfacao, risco_cancelamento, motivos_cancelamento, oportunidade_venda, upsell, upsell_sugestao, emocoes, objecoes, resumo, proxima_acao, analisado_em`.

Os tipos existentes vêm de `GET /v2/custom_data_types`. Ao usar um tipo novo, confirme com o time do Sensedata se ele precisa ser criado antes.

### Nota do cliente: `POST /v2/customers_notes`
A análise completa em texto, como nota do cliente.

### Webhook
`POST` com a análise em JSON para n8n, Zapier ou Make. Inclui o `identificador` (telefone ou e-mail), para o fluxo casar com o CRM.

## Privacidade

- O telefone ou e-mail do cliente **nunca vai ao Claude**: ele fica na extensão e só é usado para localizar o contato no Sensedata.
- Com a anonimização ligada, o Claude recebe apenas papéis (Cliente/Atendente) e o texto com telefone, e-mail, CPF e CNPJ mascarados.
