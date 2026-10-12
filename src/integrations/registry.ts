import type { Connector } from "./types";
import { demoConnector } from "./connectors/demo";
import { githubConnector } from "./connectors/github";
import { restConnector } from "./connectors/rest";

/** Para adicionar um novo sistema ao hub, implemente `Connector` e registre aqui. */
export const connectors: Connector[] = [demoConnector, githubConnector, restConnector];

export function getConnector(id: string): Connector {
  const c = connectors.find((c) => c.id === id);
  if (!c) throw new Error(`Conector desconhecido: ${id}`);
  return c;
}
