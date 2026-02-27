import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [user, setUser] = useState(null);
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();

      const tgUser = WebApp.initDataUnsafe?.user;

      if (tgUser) {
        setUser(tgUser);
        setInTelegram(true);
      }
    } catch (e) {
      console.log("Not in Telegram");
    }
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>GoKart Mini App</h1>

      {inTelegram ? (
        <>
          <h3>Вы в Telegram ✅</h3>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </>
      ) : (
        <h3>Открыто в браузере ⚠️</h3>
      )}
    </div>
  );
}

export default App;