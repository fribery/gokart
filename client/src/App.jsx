import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [status, setStatus] = useState("Инициализация...");
  const [profile, setProfile] = useState(null);
  const [rawResponse, setRawResponse] = useState("");

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

        setStatus("Инициализация с Telegram...");

        const response = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        });

        const text = await response.text();
        setRawResponse(text);

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          setStatus(`Сервер вернул НЕ JSON (HTTP ${response.status})`);
          return;
        }

        if (!data.ok) {
          setStatus(`Ошибка авторизации (HTTP ${response.status}): ${data.error}`);
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

      <p><strong>Status:</strong> {status}</p>

      {profile && (
        <>
          <h3>Профиль пользователя</h3>
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
        </>
      )}

      <h3>Raw API response</h3>
      <pre
        style={{
          background: "#f4f4f4",
          padding: 10,
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {rawResponse}
      </pre>
    </div>
  );
}

export default App;