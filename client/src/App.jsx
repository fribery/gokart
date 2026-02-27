import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [status, setStatus] = useState("Загрузка...");
  const [inTelegram, setInTelegram] = useState(false);

  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", agree: false });

  const loadAuth = async () => {
    const initData = WebApp.initData;
    const unsafeUser = WebApp.initDataUnsafe?.user;

    if (!unsafeUser || !initData) {
      setInTelegram(false);
      setStatus("Открыто в браузере ⚠️");
      return;
    }

    setInTelegram(true);
    setStatus("Проверяем профиль...");

    const r = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData }),
    });

    const data = await r.json();
    if (!data.ok) {
      setStatus("Ошибка авторизации: " + (data.error || "unknown"));
      return;
    }

    setAuth(data.auth);
    setProfile(data.profile);
    setNeedsRegistration(Boolean(data.needsRegistration));
    setStatus("Готово");
  };

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {}

    loadAuth().catch((e) => setStatus("Ошибка: " + String(e?.message || e)));
  }, []);

  const onChange = (key) => (e) => {
    const value = key === "agree" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const canSubmit =
    form.agree &&
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 8;

  const submit = async () => {
    if (!canSubmit) return;

    try {
      setStatus("Сохраняем регистрацию...");

      const initData = WebApp.initData;

      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          name: form.name,
          phone: form.phone,
          agree: form.agree,
        }),
      });

      const data = await r.json();
      if (!data.ok) {
        setStatus("Ошибка регистрации: " + (data.error || "unknown"));
        return;
      }

      // перезагрузим профиль
      await loadAuth();

      try {
        WebApp.showPopup({ title: "Готово", message: "Регистрация сохранена" });
      } catch {}

      setStatus("Готово");
    } catch (e) {
      setStatus("Ошибка: " + String(e?.message || e));
    }
  };

  if (!inTelegram) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>GoKart</h1>
        <p>{status}</p>
        <p style={{ opacity: 0.8 }}>
          Открой приложение внутри Telegram через бота.
        </p>
      </div>
    );
  }

  // Экран регистрации
  if (needsRegistration) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>Регистрация</h1>
        <p style={{ marginTop: 8, opacity: 0.85 }}>
          Заполни данные — сохраним в Supabase.
        </p>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Имя
          </label>
          <input
            value={form.name}
            onChange={onChange("name")}
            placeholder="Например, Евгений"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>
            Телефон
          </label>
          <input
            value={form.phone}
            onChange={onChange("phone")}
            placeholder="+7 999 123-45-67"
            inputMode="tel"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 12,
            fontSize: 14,
          }}
        >
          <input type="checkbox" checked={form.agree} onChange={onChange("agree")} />
          Согласен с правилами программы лояльности
        </label>

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: canSubmit ? "black" : "#999",
            color: "white",
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Зарегистрироваться
        </button>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
          status: {status}
        </p>
      </div>
    );
  }

  // Главный экран (пока простой)
  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>GoKart</h1>
      <p style={{ marginTop: 8 }}>
        Вы в Telegram ✅
      </p>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#f4f4f4" }}>
        <h3 style={{ marginTop: 0 }}>Профиль (из Supabase)</h3>
        <pre style={{ margin: 0, fontSize: 12 }}>
          {JSON.stringify(profile, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#f4f4f4" }}>
        <h3 style={{ marginTop: 0 }}>Auth (из Telegram, проверено)</h3>
        <pre style={{ margin: 0, fontSize: 12 }}>
          {JSON.stringify(auth, null, 2)}
        </pre>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        status: {status}
      </p>
    </div>
  );
}

export default App;