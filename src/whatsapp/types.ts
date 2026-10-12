export interface WaMessage {
  autor: string;
  direcao: "recebida" | "enviada";
  /** Como o WhatsApp Web exibe, ex.: "10:32, 12/10/2026". */
  horario: string;
  texto: string;
}

export interface WaChat {
  contato: string;
  capturadoEm: string;
  mensagens: WaMessage[];
}
