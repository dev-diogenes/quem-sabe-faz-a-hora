# Escopo: módulo Conversas do WhatsApp

Módulo do **Quem Sabe Faz a Hora** inspirado em produtos de inteligência de conversas comerciais (referência citada pelo time: *Lunatic Monkeys*). O objetivo é **exportar conversas do WhatsApp Web** e **extrair sinais de negócio** com o Claude: sentimento, oportunidade de venda, upsell e risco de cancelamento.

> A funcionalidade foi escrita a partir da descrição do produto de referência, não da cópia dele. Não reproduzimos código, marca ou interface de terceiros.

## Problema

Times de vendas e Customer Success conversam com clientes pelo WhatsApp, mas o que acontece ali não chega ao CRM nem aos indicadores. Sinais de compra, de expansão e de cancelamento se perdem no histórico do celular.

## O que já está entregue (v0.2)

| Capacidade | Como funciona |
|---|---|
| Captura da conversa aberta | Content script em `web.whatsapp.com` lê as mensagens carregadas na tela: autor, direção (recebida/enviada), horário e texto |
| Anonimização (padrão: ligada) | Troca nomes por papéis (Cliente/Atendente) e mascara telefone, e-mail, CPF e CNPJ antes de salvar ou enviar |
| Exportação | JSON (com a análise), CSV (abre no Excel com acentos) e TXT |
| Análise com o Claude | Saída estruturada e validada (`zod`): resumo, sentimento (geral, score de -1 a 1, evolução, emoções), oportunidade de venda, upsell (com sugestão), risco de cancelamento (com motivos), objeções, próxima ação e mensagem sugerida |
| Evidências | Cada nível vem com trechos da conversa que o justificam; sem sinal, o nível é "nenhuma" |
| Painel | Aba **Conversas** no painel lateral, com botão de copiar a mensagem sugerida |

Código: `src/whatsapp/`, `src/content/whatsapp.ts`, `src/background/analyze.ts` e `src/sidepanel/components/WhatsApp.tsx`.

## Próximas fases

### Fase 2: histórico e lote
- [ ] Guardar várias conversas analisadas (hoje fica só a última)
- [ ] Analisar em lote as conversas da lista do WhatsApp Web
- [ ] Rolar a conversa automaticamente para capturar o histórico completo
- [ ] Transcrever áudios e ler legendas de imagens e documentos

### Fase 3: integração com o hub
- [ ] Expor as análises como conector, para o Chat cruzar com ERP e CRM ("clientes com risco alto e pedido atrasado")
- [ ] Enviar a análise para o CRM (nota, tarefa, campo de health score) por meio do conector REST
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
