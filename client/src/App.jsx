import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [status, setStatus] = useState("Загрузка...");
  const [raw, setRaw] = useState("");
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function run() {
      try {
        WebApp.ready();
        WebApp.expand();

        const initData = WebApp.initData;
        const unsafeUser = WebApp.initDataUnsafe?.user;

        if (!unsafeUser || !initData) {
          setStatus("Открыто в браузере ⚠️");
          return;
        }

        setStatus("Запрос /api/auth/telegram ...");

        const r = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        const text = await r.text();
        setRaw(text);

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          setStatus(`Ответ не JSON (HTTP ${r.status})`);
          return;
        }

        if (!data.ok) {
          setStatus(
            `Ошибка авторизации (HTTP ${r.status}): ${data.error}${data.details ? " | " + data.details : ""}`
          );
          return;
        }

        setAuth(data.auth || null);
        setProfile(data.profile || null);
        setStatus(`OK ✅ needsRegistration=${String(data.needsRegistration)}`);
      } catch (e) {
        setStatus("Ошибка: " + String(e?.message || e));
      }
    }

    run();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>GoKart</h1>
      <p>
        <b>Status:</b> {status}
      </p>

      <h3>Auth</h3>
      <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 12, fontSize: 12 }}>
        {JSON.stringify(auth, null, 2)}
      </pre>

      <h3>Profile</h3>
      <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 12, fontSize: 12 }}>
        {JSON.stringify(profile, null, 2)}
      </pre>

      <h3>Raw response</h3>
      <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 12, fontSize: 12, whiteSpace: "pre-wrap" }}>
        {raw}
      </pre>
    </div>
  );
}

export default App;