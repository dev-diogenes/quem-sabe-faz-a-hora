import { useState } from "react";
import { Hub } from "./components/Hub";
import { Chat } from "./components/Chat";
import { SystemDetail } from "./components/SystemDetail";

type View = { name: "hub" } | { name: "system"; id: string } | { name: "chat" };

export function App() {
  const [view, setView] = useState<View>({ name: "hub" });
  const [chatFocus, setChatFocus] = useState<string[]>([]);

  const openChat = (integrationIds: string[] = []) => {
    setChatFocus(integrationIds);
    setView({ name: "chat" });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" title="Quem sabe faz a hora, não espera acontecer">
          <span className="logo">🌹</span>
          <span>Faz a Hora</span>
        </div>
        <nav className="tabs">
          <button className={view.name !== "chat" ? "active" : ""} onClick={() => setView({ name: "hub" })}>
            Hub
          </button>
          <button className={view.name === "chat" ? "active" : ""} onClick={() => openChat(chatFocus)}>
            Chat
          </button>
          <button className="icon" title="Configurações" onClick={() => chrome.runtime.openOptionsPage()}>
            ⚙
          </button>
        </nav>
      </header>
      <main className="content">
        {view.name === "hub" && (
          <Hub onOpen={(id) => setView({ name: "system", id })} onChat={openChat} />
        )}
        {view.name === "system" && (
          <SystemDetail id={view.id} onBack={() => setView({ name: "hub" })} onChat={() => openChat([view.id])} />
        )}
        {view.name === "chat" && <Chat focus={chatFocus} onFocusChange={setChatFocus} />}
      </main>
    </div>
  );
}
