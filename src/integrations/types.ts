/**
 * Contrato que todo conector de sistema implementa. Um conector descreve um
 * *tipo* de sistema (GitHub, REST genérico...). Uma `Integration` é uma
 * instância configurada desse conector pelo usuário.
 */

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "textarea";
  placeholder?: string;
  help?: string;
  required?: boolean;
}

export type IntegrationConfig = Record<string, string>;

export interface Integration {
  id: string;
  connectorId: string;
  name: string;
  config: IntegrationConfig;
  enabled: boolean;
  createdAt: number;
}

export interface Metric {
  label: string;
  value: string | number;
  hint?: string;
}

export interface Table {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

/** Visão consolidada exibida no hub ao abrir um sistema. */
export interface Overview {
  metrics: Metric[];
  tables: Table[];
}

/** JSON Schema simples aceito pela API do Claude em `input_schema`. */
export interface ToolInputSchema {
  [key: string]: unknown;
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: false;
}

/** Uma ferramenta que o Claude pode chamar para consultar o sistema. */
export interface ConnectorTool {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
  run(config: IntegrationConfig, input: Record<string, unknown>): Promise<unknown>;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  emoji: string;
  configFields: ConfigField[];
  /** Origens que precisam de permissão de host (pedida em tempo de execução). */
  origins?(config: IntegrationConfig): string[];
  test(config: IntegrationConfig): Promise<{ ok: boolean; message: string }>;
  overview(config: IntegrationConfig): Promise<Overview>;
  tools: ConnectorTool[];
}
