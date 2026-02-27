import React, { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";

const LS_KEY = "gokart_registered_v1";

function App() {
  const [status, setStatus] = useState("init");
  const [inTelegram, setInTelegram] = useState(false);

  const [registered, setRegistered] = useState(false);

  // "Профиль" из Telegram (unsafe для UI, безопасный возьмём позже с backend)
  const tgUser = useMemo(() => WebApp.initDataUnsafe?.user || null, []);

  // Простая форма регистрации (пока без отправки на сервер)
  const [form, setForm] = useState({
    phone: "",
    name: "",
    agree: false,
  });

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {}

    const hasTg = Boolean(WebApp.initDataUnsafe?.user) && Boolean(WebApp.initData);
    setInTelegram(hasTg);

    const saved = localStorage.getItem(LS_KEY);
    setRegistered(saved === "1");

    setStatus("ready");
  }, []);

  const onChange = (key) => (e) => {
    const value = key === "agree" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const canSubmit =
    form.agree &&
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 8; // супер грубо, потом нормализуем

  const submit = () => {
    if (!canSubmit) return;

    // Сейчас: просто считаем, что регистрация прошла.
    // Потом: отправим на backend + Supabase.
    localStorage.setItem(LS_KEY, "1");
    setRegistered(true);

    // маленький фидбек в телеге (если внутри)
    try {
      if (inTelegram) WebApp.showPopup({ title: "Готово", message: "Регистрация сохранена" });
    } catch {}
  };

  const reset = () => {
    localStorage.removeItem(LS_KEY);
    setRegistered(false);
    setForm({ phone: "", name: "", agree: false });
  };

  if (status !== "ready") {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>GoKart Mini App</h1>
        <p>Загрузка...</p>
      </div>
    );
  }

  // Если уже "зарегистрирован" — пропускаем регистрацию
  if (registered) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>GoKart</h1>

        <p style={{ marginTop: 8 }}>
          {inTelegram ? "Вы в Telegram ✅" : "Открыто в браузере ⚠️"}
        </p>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "#f4f4f4",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Главный экран (заглушка)</h3>
          <p style={{ margin: 0 }}>
            Дальше тут будет баланс, история операций и т.д.
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Данные Telegram (для проверки)</h3>
          <pre style={{ background: "#f4f4f4", padding: 12, borderRadius: 12, fontSize: 12 }}>
            {JSON.stringify(tgUser, null, 2)}
          </pre>
        </div>

        <button
          onClick={reset}
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
          }}
        >
          Сбросить “регистрацию” (для теста)
        </button>
      </div>
    );
  }

  // Экран регистрации
  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>Регистрация</h1>

      <p style={{ marginTop: 8 }}>
        {inTelegram
          ? "Откройте пару полей — потом привяжем к Supabase."
          : "Лучше открывать из Telegram, но форма работает и в браузере."}
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

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
        <div>Debug:</div>
        <div>inTelegram: {String(inTelegram)}</div>
        <div>tgUserId: {tgUser?.id ? String(tgUser.id) : "нет"}</div>
      </div>
    </div>
  );
}

export default App;