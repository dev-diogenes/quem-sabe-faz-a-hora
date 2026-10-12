export type Canal = "whatsapp" | "email";

export interface Mensagem {
  autor: string;
  /** E-mail do remetente (só no canal e-mail). */
  email?: string;
  direcao: "recebida" | "enviada";
  /** Como a ferramenta exibe, ex.: "10:32, 12/10/2026". */
  horario: string;
  texto: string;
}

export interface Conversa {
  canal: Canal;
  contato: string;
  /**
   * Telefone (só dígitos) ou e-mail do cliente, usado para localizar o
   * contato no CRM. Nunca é enviado ao Claude.
   */
  identificador?: string;
  /** Assunto da thread (e-mail). */
  assunto?: string;
  capturadoEm: string;
  mensagens: Mensagem[];
  /** Mensagens que existiam mas não puderam ser lidas (ex.: recolhidas no Gmail). */
  naoCapturadas?: number;
}

export const CANAL_NOME: Record<Canal, string> = { whatsapp: "WhatsApp", email: "E-mail" };
