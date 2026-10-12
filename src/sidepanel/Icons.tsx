import type { JSX, SVGProps } from "react";

/** Ícones de traço (sem emoji), herdam a cor do texto. */
function Stroke(props: SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 18, children, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const ChatIcon = (p: P) => <Stroke {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Stroke>;
export const SettingsIcon = (p: P) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Stroke>
);
export const BackIcon = (p: P) => <Stroke {...p}><path d="M15 18l-6-6 6-6" /></Stroke>;
export const RefreshIcon = (p: P) => <Stroke {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Stroke>;
export const SendIcon = (p: P) => <Stroke {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Stroke>;
export const CheckIcon = (p: P) => <Stroke {...p}><path d="M20 6L9 17l-5-5" /></Stroke>;
export const XIcon = (p: P) => <Stroke {...p}><path d="M18 6L6 18M6 6l12 12" /></Stroke>;
export const PageIcon = (p: P) => <Stroke {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></Stroke>;
export const PlusIcon = (p: P) => <Stroke {...p}><path d="M12 5v14M5 12h14" /></Stroke>;
export const MailIcon = (p: P) => <Stroke {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Stroke>;
export const WhatsAppIcon = (p: P) => (
  <Stroke {...p}><path d="M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.5z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a3.5 3.5 0 0 1-2-2l.8-1-1-2z" /></Stroke>
);

const CONNECTOR_ICONS: Record<string, (p: P) => JSX.Element> = {
  demo: (p) => <Stroke {...p}><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21V12h6v9" /></Stroke>,
  github: (p) => <Stroke {...p}><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="8" r="2.5" /><path d="M6 8.5v7M18 10.5c0 4-6 3-11 5.5" /></Stroke>,
  rest: (p) => <Stroke {...p}><path d="M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0z" /><path d="M12 17v4" /></Stroke>,
};

/** Tom de cada conector: [fundo, cor do ícone]. */
const CONNECTOR_TONES: Record<string, string> = { demo: "tone-red", github: "tone-blue", rest: "tone-amber" };

export function ConnectorIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = CONNECTOR_ICONS[id] ?? CONNECTOR_ICONS.rest;
  return (
    <span className={`connector-icon ${CONNECTOR_TONES[id] ?? "tone-amber"}`}>
      <Icon size={size} />
    </span>
  );
}

/** O cravo: marca da extensão. */
export function Carnation({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 17v13" stroke="#1F7A55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 25c3-4 7-4 9-3-2 3-5 4-9 3z" fill="#1F7A55" />
      <circle cx="16" cy="10" r="7" fill="#D7263D" />
      <circle cx="10.5" cy="8" r="4" fill="#B3172E" />
      <circle cx="21.5" cy="8" r="4" fill="#B3172E" />
      <circle cx="16" cy="4.5" r="4" fill="#E2485C" />
      <circle cx="16" cy="11" r="3.4" fill="#E2485C" />
    </svg>
  );
}
