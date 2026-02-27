import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [status, setStatus] = useState("Инициализация...");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        WebApp.ready();
        WebApp.expand();

        const initData = WebApp.initData;
        const unsafeUser = WebApp.initDataUnsafe?.user;

        if (!unsafeUser || !initData) {
          setStatus("Открыто в браузере ⚠️");
          return;
        }

        setStatus("Авторизация через Telegram...");

        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (!data.ok) {
          setStatus("Ошибка авторизации: " + data.error);
          return;
        }

        setProfile(data.profile);
        setStatus("Вы в Telegram ✅ (проверено backend)");
      } catch (err) {
        setStatus("Ошибка: " + (err?.message || String(err)));
      }
    }

    init();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>GoKart Mini App</h1>
      <p>Status: {status}</p>

      {profile && (
        <pre
          style={{
            background: "#f4f4f4",
            padding: 10,
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          {JSON.stringify(profile, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default App;