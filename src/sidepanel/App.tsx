import { useState } from "react";
import { Hub } from "./components/Hub";
import { Chat } from "./components/Chat";
import { SystemDetail } from "./components/SystemDetail";
import { Conversations } from "./components/Conversations";
import { Carnation, SettingsIcon } from "./Icons";

type View = { name: "hub" } | { name: "system"; id: string } | { name: "chat" } | { name: "conversas" };

export function App() {
  const [view, setView] = useState<View>({ name: "hub" });
  const [chatFocus, setChatFocus] = useState<string[]>([]);

  const openChat = (integrationIds: string[] = []) => {
    setChatFocus(integrationIds);
    setView({ name: "chat" });
  };

  const tab = view.name === "system" ? "hub" : view.name;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" title="Quem sabe faz a hora, não espera acontecer">
          <Carnation />
          <span>Faz a Hora</span>
        </div>
        <nav className="tabs" aria-label="Seções">
          <div className="segmented">
            <button className={tab === "hub" ? "active" : ""} onClick={() => setView({ name: "hub" })}>
              Hub
            </button>
            <button className={tab === "chat" ? "active" : ""} onClick={() => openChat(chatFocus)}>
              Chat
            </button>
            <button className={tab === "conversas" ? "active" : ""} onClick={() => setView({ name: "conversas" })}>
              Conversas
            </button>
          </div>
          <button className="icon" aria-label="Configurações" onClick={() => chrome.runtime.openOptionsPage()}>
            <SettingsIcon size={20} />
          </button>
        </nav>
      </header>
      <main className="content">
        {view.name === "hub" && (
          <Hub
            onOpen={(id) => setView({ name: "system", id })}
            onChat={openChat}
            onConversations={() => setView({ name: "conversas" })}
          />
        )}
        {view.name === "system" && (
          <SystemDetail id={view.id} onBack={() => setView({ name: "hub" })} onChat={() => openChat([view.id])} />
        )}
        {view.name === "chat" && <Chat focus={chatFocus} onFocusChange={setChatFocus} />}
        {view.name === "conversas" && <Conversations />}
      </main>
    </div>
  );
}
