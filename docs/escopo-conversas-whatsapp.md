# Escopo: módulo Conversas do WhatsApp

Módulo do **Quem Sabe Faz a Hora** inspirado em produtos de inteligência de conversas comerciais. A referência citada pelo time é a **Lunatic Monkey** (lunaticmonkey.com, também com extensão na Chrome Web Store). O objetivo é **exportar conversas do WhatsApp Web** e **extrair sinais de negócio** com o Claude: sentimento, oportunidade de venda, upsell e risco de cancelamento.

> A funcionalidade foi escrita a partir da descrição do produto de referência, não da cópia dele. Não reproduzimos código, marca ou interface de terceiros.

## Problema

Times de vendas e Customer Success conversam com clientes pelo WhatsApp, mas o que acontece ali não chega ao CRM nem aos indicadores. Sinais de compra, de expansão e de cancelamento se perdem no histórico do celular.

## Referência: Lunatic Monkey

O site e a página da extensão não puderam ser lidos durante o desenvolvimento, por bloqueio de rede. O que segue vem de perfis públicos da empresa (Crunchbase, Dealroom, PitchBook) e de resultados de busca:

- Startup brasileira de **Customer Relationship Intelligence (CRI)** para times de Customer Success e vendas.
- Analisa conversas, principalmente do **WhatsApp**, conectadas por **QR Code**, ou seja, com captura automática.
- Aponta **risco de churn**, **nível de satisfação** e **oportunidades de expansão**.
- **Atualiza o CRM automaticamente** e se integra a ferramentas de CRM e comunicação.
- A IA tem nome próprio, "Cesar", e a empresa enfatiza conformidade com a LGPD.

### Comparação

| Capacidade | Lunatic Monkey | Faz a Hora |
|---|---|---|
| Captura de conversas | Automática (QR Code) | Manual, uma conversa por vez no WhatsApp Web |
| Sentimento | Sim | Sim, com score e evolução |
| Satisfação | Sim | Sim, nota de 1 a 5 com justificativa |
| Risco de churn | Sim | Sim, com motivos e evidências |
| Expansão / upsell | Sim | Sim, com sugestão do que oferecer |
| Oportunidade de venda nova | Não informado | Sim |
| Próxima ação e mensagem pronta | Não informado | Sim |
| Atualização do CRM | Automática, com integrações nativas | Webhook (n8n, Zapier, Make) por conversa |
| Histórico | Sim | Últimas 50 análises, no navegador |
| Exportação | Não informado | JSON, CSV e TXT |
| Cruzar com outros sistemas | Não informado | Hub e Chat com ERP, GitHub e APIs REST |

**Sobre a captura automática:** conectar um número por QR Code e ler as conversas num servidor usa uma sessão não oficial do WhatsApp Web. Isso contraria os termos do WhatsApp e expõe o número a bloqueio. Para captura automática, o caminho recomendado é a **WhatsApp Business Platform (Cloud API)**, que recebe as mensagens por webhook. Esse é um item da Fase 3.

## Novidades da v0.4

- **Gmail**: captura a thread aberta inteira, com remetentes, datas e corpo de cada mensagem expandida, sem o histórico citado. Avisa quando há mensagens recolhidas.
- **Sensedata**: localiza o contato por `phone`/`phone2` (WhatsApp) ou `email` (Gmail) e grava a análise como atividade, dado customizado ou nota. Ver [`sensedata.md`](sensedata.md).
- O telefone ou e-mail do cliente é capturado para o CRM, mas nunca vai ao Claude.

## O que já estava entregue (v0.3)

| Capacidade | Como funciona |
|---|---|
| Captura da conversa aberta | Content script em `web.whatsapp.com` lê as mensagens carregadas na tela: autor, direção (recebida/enviada), horário e texto |
| Anonimização (padrão: ligada) | Troca nomes por papéis (Cliente/Atendente) e mascara telefone, e-mail, CPF e CNPJ antes de salvar ou enviar |
| Exportação | JSON (com a análise), CSV (abre no Excel com acentos) e TXT |
| Análise com o Claude | Saída estruturada e validada (`zod`): resumo, sentimento (geral, score de -1 a 1, evolução, emoções), satisfação (1 a 5), oportunidade de venda, upsell (com sugestão), risco de cancelamento (com motivos), objeções, próxima ação e mensagem sugerida |
| Evidências | Cada nível vem com trechos da conversa que o justificam; sem sinal, o nível é "nenhuma" |
| Painel | Aba **Conversas** no painel lateral, com botão de copiar a mensagem sugerida |
| Histórico | As últimas 50 conversas analisadas, com risco, venda e satisfação, e reabertura com um clique |
| Envio ao CRM | Webhook configurável nas opções: POST com a análise em JSON (e a transcrição, se marcado), para n8n, Zapier, Make ou um endpoint do CRM |

Código: `src/whatsapp/` (inclui `webhook.ts`), `src/content/whatsapp.ts`, `src/background/analyze.ts` e `src/sidepanel/components/WhatsApp.tsx`.

## Próximas fases

### Fase 2: lote e captura completa
- [x] Guardar várias conversas analisadas
- [ ] Analisar em lote as conversas da lista do WhatsApp Web
- [ ] Rolar a conversa automaticamente para capturar o histórico completo
- [ ] Transcrever áudios e ler legendas de imagens e documentos

### Fase 3: integração com o hub
- [ ] Expor as análises como conector, para o Chat cruzar com ERP e CRM ("clientes com risco alto e pedido atrasado")
- [x] Enviar a análise para o CRM via webhook
- [x] Integração nativa com o Sensedata (atividade, dado customizado, nota)
- [x] Threads do Gmail
- [ ] Outros CRMs nativos (HubSpot, Pipedrive, RD Station)
- [ ] Captura automática pela WhatsApp Business Platform (API oficial)
- [ ] Alertas no hub quando o risco de cancelamento for alto

### Fase 4: gestão
- [ ] Painel por atendente e por período: sentimento médio, oportunidades e riscos
- [ ] Regras de negócio configuráveis (produtos para upsell, gatilhos de cancelamento)
- [ ] Backend próprio: chave da API fora do navegador, armazenamento central e trilha de auditoria

## Riscos e cuidados

- **Termos do WhatsApp:** a leitura do WhatsApp Web via DOM não é uma API oficial. A captura é manual, de uma conversa por vez, iniciada pelo usuário. Automação em massa pode violar os termos do WhatsApp e levar a bloqueio da conta. Para escala, o caminho é a **WhatsApp Business Platform (API oficial)**.
- **LGPD:** conversas contêm dados pessoais de terceiros. O uso exige base legal (por exemplo, execução de contrato ou legítimo interesse documentado), transparência com o cliente e retenção mínima. A anonimização reduz o risco, mas não substitui essas medidas: nomes citados no meio do texto não são mascarados.
- **Envio para a Anthropic:** a análise envia o texto da conversa para a API do Claude. A interface avisa isso antes de cada análise.
- **Fragilidade:** os seletores do WhatsApp Web mudam sem aviso. Ficam todos em `src/whatsapp/extract.ts` para facilitar o ajuste.
- **Alcance:** só as mensagens já carregadas na tela são capturadas.
