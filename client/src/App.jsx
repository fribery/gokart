import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("init");

  useEffect(() => {
    (async () => {
      try {
        WebApp.ready();
        WebApp.expand();

        const initData = WebApp.initData;
        const userUnsafe = WebApp.initDataUnsafe?.user;

        if (!userUnsafe || !initData) {
          setStatus("not_in_telegram");
          return;
        }

        setStatus("auth...");

        const r = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData })
        });

        const data = await r.json();
        if (!data.ok) {
          setStatus("auth_failed");
          return;
        }

        setProfile(data.profile);
        setStatus("ok");
      } catch (e) {
        setStatus("error: " + String(e));
      }
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>GoKart Mini App</h1>
      <p>status: {status}</p>

      {profile ? (
        <>
          <h3>Профиль (проверено backend)</h3>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </>
      ) : null}
    </div>
  );
}

export default App;