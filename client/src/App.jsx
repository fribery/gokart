import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";

function App() {
  const [status, setStatus] = useState("Загрузка...");
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);

  const [form, setForm] = useState({ name: "", phone: "", agree: false });

  // админ форма
  const [admin, setAdmin] = useState({ targetTelegramId: "", amount: "", note: "" });

  const inTelegram = Boolean(WebApp.initDataUnsafe?.user) && Boolean(WebApp.initData);

  async function api(path, payload) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return { r, data };
  }

  async function loadMe() {
    const { data } = await api("/api/me", { initData: WebApp.initData });
    if (!data.ok) throw new Error(`${data.error}${data.details ? " | " + data.details : ""}`);

    setAuth(data.auth);
    setProfile(data.profile);
    setNeedsRegistration(Boolean(data.needsRegistration));
    setBalance(Number(data.balance || 0));
  }

  async function loadTxs() {
    const { data } = await api("/api/transactions", { initData: WebApp.initData, limit: 30 });
    if (!data.ok) throw new Error(`${data.error}${data.details ? " | " + data.details : ""}`);
    setTxs(Array.isArray(data.items) ? data.items : []);
  }

  async function refreshAll() {
    setStatus("Обновление...");
    await loadMe();
    await loadTxs();
    setStatus("Готово");
  }

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {}

    if (!inTelegram) {
      setStatus("Открыто в браузере ⚠️");
      return;
    }

    refreshAll().catch((e) => setStatus("Ошибка: " + String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRegChange = (key) => (e) => {
    const value = key === "agree" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [key]: value }));
  };

  const canRegister =
    form.agree && form.name.trim().length >= 2 && form.phone.trim().length >= 8;

  async function submitRegister() {
    if (!canRegister) return;

    try {
      setStatus("Сохраняем регистрацию...");
      const { data } = await api("/api/register", {
        initData: WebApp.initData,
        name: form.name,
        phone: form.phone,
        agree: form.agree,
      });

      if (!data.ok) {
        setStatus(`Ошибка регистрации: ${data.error}${data.details ? " | " + data.details : ""}`);
        return;
      }

      await refreshAll();
      try { WebApp.showPopup({ title: "Готово", message: "Регистрация сохранена" }); } catch {}
    } catch (e) {
      setStatus("Ошибка: " + String(e?.message || e));
    }
  }

  const onAdminChange = (key) => (e) => setAdmin((p) => ({ ...p, [key]: e.target.value }));

  async function adminEarn() {
    try {
      setStatus("Админ: начисление...");
      const { data } = await api("/api/admin/earn", {
        initData: WebApp.initData,
        targetTelegramId: Number(admin.targetTelegramId),
        amount: Number(admin.amount),
        note: admin.note,
      });

      if (!data.ok) {
        setStatus(`Ошибка: ${data.error}${data.details ? " | " + data.details : ""}${data.balance != null ? " | balance=" + data.balance : ""}`);
        return;
      }

      await refreshAll();
      setStatus("Готово");
    } catch (e) {
      setStatus("Ошибка: " + String(e?.message || e));
    }
  }

  async function adminSpend() {
    try {
      setStatus("Админ: списание...");
      const { data } = await api("/api/admin/spend", {
        initData: WebApp.initData,
        targetTelegramId: Number(admin.targetTelegramId),
        amount: Number(admin.amount),
        note: admin.note,
      });

      if (!data.ok) {
        setStatus(`Ошибка: ${data.error}${data.details ? " | " + data.details : ""}${data.balance != null ? " | balance=" + data.balance : ""}`);
        return;
      }

      await refreshAll();
      setStatus("Готово");
    } catch (e) {
      setStatus("Ошибка: " + String(e?.message || e));
    }
  }

  if (!inTelegram) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>GoKart</h1>
        <p>{status}</p>
        <p style={{ opacity: 0.8 }}>Открой приложение в Telegram через бота.</p>
      </div>
    );
  }

  if (needsRegistration) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>Регистрация</h1>
        <p style={{ opacity: 0.85 }}>Заполни данные — сохраним в Supabase.</p>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>Имя</label>
          <input
            value={form.name}
            onChange={onRegChange("name")}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 6 }}>Телефон</label>
          <input
            value={form.phone}
            onChange={onRegChange("phone")}
            inputMode="tel"
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontSize: 14 }}>
          <input type="checkbox" checked={form.agree} onChange={onRegChange("agree")} />
          Согласен с правилами программы лояльности
        </label>

        <button
          onClick={submitRegister}
          disabled={!canRegister}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: canRegister ? "black" : "#999",
            color: "white",
            cursor: canRegister ? "pointer" : "not-allowed",
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Зарегистрироваться
        </button>

        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>status: {status}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ margin: 0 }}>GoKart</h1>
        <button
          onClick={() => refreshAll().catch((e) => setStatus("Ошибка: " + String(e?.message || e)))}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
        >
          Обновить
        </button>
      </div>

      <p style={{ marginTop: 10 }}>
        Привет, {profile?.name || auth?.firstName || "гость"} 👋
      </p>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#f4f4f4" }}>
        <div style={{ fontSize: 14, opacity: 0.8 }}>Баланс</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{balance} баллов</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>История</h3>
        {txs.length === 0 ? (
          <div style={{ padding: 12, borderRadius: 12, background: "#f4f4f4", opacity: 0.8 }}>
            Пока нет операций
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {txs.map((t) => (
              <div key={t.id} style={{ padding: 12, borderRadius: 12, background: "#f4f4f4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <b>{t.type}</b>
                  <b>{t.amount > 0 ? `+${t.amount}` : t.amount}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {new Date(t.created_at).toLocaleString()}
                </div>
                {t.note ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{t.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {auth?.isAdmin ? (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: "#f4f4f4" }}>
          <h3 style={{ marginTop: 0 }}>Админ</h3>

          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Пока просто вводим target telegramId (позже сделаем поиск/QR).
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <input
              value={admin.targetTelegramId}
              onChange={onAdminChange("targetTelegramId")}
              placeholder="telegramId клиента (например 589918672)"
              inputMode="numeric"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />
            <input
              value={admin.amount}
              onChange={onAdminChange("amount")}
              placeholder="Сумма (например 50)"
              inputMode="numeric"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />
            <input
              value={admin.note}
              onChange={onAdminChange("note")}
              placeholder="Комментарий (опционально)"
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={adminEarn}
                style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "none", background: "black", color: "white" }}
              >
                Начислить
              </button>
              <button
                onClick={adminSpend}
                style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}
              >
                Списать
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>status: {status}</p>
    </div>
  );
}

export default App;