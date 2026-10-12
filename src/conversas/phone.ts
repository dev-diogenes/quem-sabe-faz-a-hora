/** Utilitários de telefone brasileiro para casar o WhatsApp com o CRM. */

export const digits = (s: string) => s.replace(/\D/g, "");

/** Número nacional (DDD + número), sem o 55 do país. */
export function nacional(s: string): string {
  const d = digits(s);
  return d.length >= 12 && d.startsWith("55") ? d.slice(2) : d;
}

/** Remove o nono dígito de celular, para comparar números antigos e novos. */
const sem9 = (n: string) => (n.length === 11 && n[2] === "9" ? n.slice(0, 2) + n.slice(3) : n);

/** Mesmo telefone, tolerando +55, formatação e o nono dígito. */
export function mesmoTelefone(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = nacional(a);
  const y = nacional(b);
  if (x.length < 8 || y.length < 8) return false;
  if (sem9(x) === sem9(y)) return true;
  // Sem DDD de um dos lados: compara os 8 últimos dígitos.
  return (x.length < 10 || y.length < 10) && x.slice(-8) === y.slice(-8);
}

/** Formas comuns de gravar o número no CRM, para buscar por igualdade. */
export function variantes(s: string): string[] {
  const n = nacional(s);
  const formas = new Set<string>();
  for (const v of [n, sem9(n), n.length === 10 ? n.slice(0, 2) + "9" + n.slice(2) : n]) {
    formas.add(`+55${v}`);
    formas.add(`55${v}`);
    formas.add(v);
  }
  return [...formas];
}
