import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Quem Sabe Faz a Hora",
  short_name: "Faz a Hora",
  description:
    "Hub de integração entre sistemas com um assistente Claude no painel lateral. Não espere acontecer.",
  version: pkg.version,
  icons: {
    16: "public/icons/icon-16.png",
    32: "public/icons/icon-32.png",
    48: "public/icons/icon-48.png",
    128: "public/icons/icon-128.png",
  },
  action: {
    default_title: "Abrir o hub Quem Sabe Faz a Hora",
    default_icon: {
      16: "public/icons/icon-16.png",
      32: "public/icons/icon-32.png",
    },
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://web.whatsapp.com/*"],
      js: ["src/content/whatsapp.ts"],
      run_at: "document_idle",
    },
    {
      matches: ["https://mail.google.com/*"],
      js: ["src/content/gmail.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["sidePanel", "storage", "activeTab", "scripting", "tabs"],
  host_permissions: [
    "https://api.anthropic.com/*",
    "https://api.github.com/*",
    "https://web.whatsapp.com/*",
    "https://mail.google.com/*",
    "https://api.sensedata.io/*",
  ],
  // Sistemas REST genéricos pedem permissão de host em tempo de execução,
  // apenas para a origem que o usuário cadastrar.
  optional_host_permissions: ["https://*/*", "http://*/*"],
});
