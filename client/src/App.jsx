import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Загрузка...");
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);

  const [form, setForm] = useState({ name: "", phone: "", agree: false });
  const [admin, setAdmin] = useState({ targetTelegramId: "", amount: "", note: "" });

  const inTelegram = Boolean(WebApp.initDataUnsafe?.user) && Boolean(WebApp.initData);

  async function api(path, payload) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  }

  async function refreshAll() {
    setStatus("Обновление...");
    const me = await api("/api/me", { initData: WebApp.initData });
    if (!me.ok) throw new Error(me.error);

    setAuth(me.auth);
    setProfile(me.profile);
    setNeedsRegistration(me.needsRegistration);
    setBalance(me.balance || 0);

    const tx = await api("/api/transactions", { initData: WebApp.initData, limit: 30 });
    if (tx.ok) setTxs(tx.items || []);
    setStatus("Готово");
  }

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {}

    if (!inTelegram) {
      setStatus("Открой приложение в Telegram");
      return;
    }

    refreshAll().catch((e) => setStatus("Ошибка: " + String(e?.message || e)));
  }, []);

  if (!inTelegram) {
    return (
      <div className="page">
        <h1 className="title">GoKart</h1>
        <p className="muted">{status}</p>
      </div>
    );
  }

  if (needsRegistration) {
    const canRegister =
      form.agree && form.name.trim().length >= 2 && form.phone.trim().length >= 8;

    return (
      <div className="page">
        <h1 className="title">Регистрация</h1>

        <div className="card">
          <input
            className="input"
            placeholder="Имя"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />

          <div className="gap" />

          <input
            className="input"
            placeholder="Телефон"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />

          <div className="gap" />

          <label className="check">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => setForm((p) => ({ ...p, agree: e.target.checked }))}
            />
            <span>Согласен с правилами</span>
          </label>

          <div className="gap-lg" />

          <button
            className={`btn btn-primary ${canRegister ? "" : "btn-disabled"}`}
            disabled={!canRegister}
            onClick={async () => {
              setStatus("Сохраняем...");
              const r = await api("/api/register", { initData: WebApp.initData, ...form });
              if (!r.ok) return setStatus(r.error);
              await refreshAll();
            }}
          >
            Зарегистрироваться
          </button>
        </div>

        <div className="status">{status}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1 className="title">GoKart</h1>
        <button className="btn btn-secondary" onClick={refreshAll}>
          Обновить
        </button>
      </div>

      <div className="card balance-card">
        <div className="muted">Баланс</div>
        <div className="balance">{balance} баллов</div>
      </div>

      <section className="section">
        <h3 className="section-title">История</h3>

        {txs.length === 0 ? (
          <div className="card muted">Пока нет операций</div>
        ) : (
          <div className="list">
            {txs.map((t) => (
              <div key={t.id} className="card tx">
                <div>
                  <div className="tx-type">{t.type}</div>
                  <div className="tx-date">{new Date(t.created_at).toLocaleString()}</div>
                </div>

                <div className={`tx-amount ${t.amount > 0 ? "pos" : "neg"}`}>
                  {t.amount > 0 ? `+${t.amount}` : t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {auth?.isAdmin && (
        <section className="section">
          <h3 className="section-title">Админ панель</h3>

          <div className="card">
            <div className="hint">
              Пока вводим target telegramId вручную (позже добавим поиск/QR).
            </div>

            <div className="gap" />

            <input
              className="input"
              placeholder="telegramId клиента"
              value={admin.targetTelegramId}
              onChange={(e) => setAdmin((p) => ({ ...p, targetTelegramId: e.target.value }))}
            />

            <div className="gap" />

            <input
              className="input"
              placeholder="Сумма"
              value={admin.amount}
              onChange={(e) => setAdmin((p) => ({ ...p, amount: e.target.value }))}
            />

            <div className="gap" />

            <input
              className="input"
              placeholder="Комментарий (опционально)"
              value={admin.note}
              onChange={(e) => setAdmin((p) => ({ ...p, note: e.target.value }))}
            />

            <div className="gap-lg" />

            <div className="row">
              <button
                className="btn btn-primary"
                onClick={async () => {
                  await api("/api/admin/earn", { initData: WebApp.initData, ...admin });
                  await refreshAll();
                }}
              >
                Начислить
              </button>

              <button
                className="btn btn-secondary"
                onClick={async () => {
                  await api("/api/admin/spend", { initData: WebApp.initData, ...admin });
                  await refreshAll();
                }}
              >
                Списать
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="status">{status}</div>
    </div>
  );
}

export default App;