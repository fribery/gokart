import React, { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import QRCode from "qrcode";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Загрузка...");
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState([]);

  const [tab, setTab] = useState("profile"); // profile | history | qr
  const [form, setForm] = useState({ name: "", phone: "", agree: false });

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
    if (!me.ok) throw new Error(`${me.error}${me.details ? " | " + me.details : ""}`);

    setAuth(me.auth);
    setProfile(me.profile);
    setNeedsRegistration(Boolean(me.needsRegistration));
    setBalance(Number(me.balance || 0));

    const tx = await api("/api/transactions", { initData: WebApp.initData, limit: 50 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR
  const qrPayload = useMemo(() => {
    if (!auth?.telegramId) return "";
    return JSON.stringify({ v: 1, telegramId: auth.telegramId, ts: Date.now(), kind: "gokart_user" });
  }, [auth?.telegramId]);

  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function make() {
      if (!qrPayload) return;
      const url = await QRCode.toDataURL(qrPayload, { margin: 1, width: 280 });
      if (!cancelled) setQrDataUrl(url);
    }
    make().catch(() => {});
    return () => { cancelled = true; };
  }, [qrPayload]);

  // --- UI helpers
  const Page = ({ children }) => (
    <div className="page">
      <div className="container">
        <div className="content">{children}</div>
      </div>
    </div>
  );

  if (!inTelegram) {
    return (
      <Page>
        <h1 className="title">GoKart</h1>
        <p className="muted">{status}</p>
      </Page>
    );
  }

  if (needsRegistration) {
    const canRegister =
      form.agree && form.name.trim().length >= 2 && form.phone.trim().length >= 8;

    return (
      <Page>
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
              try { WebApp.showPopup({ title: "Готово", message: "Регистрация сохранена. +200 баллов 🎁" }); } catch {}
            }}
          >
            Зарегистрироваться
          </button>
        </div>

        <div className="status">{status}</div>
      </Page>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="content">
          <div className="topbar">
            <h1 className="title">GoKart</h1>
            <button className="btn btn-secondary btn-small" onClick={() => refreshAll().catch(()=>{})}>
              Обновить
            </button>
          </div>

          {tab === "profile" && (
            <>
              <div className="card balance-card">
                <div className="muted">Баланс</div>
                <div className="balance">{balance} баллов</div>
              </div>

              <div className="card mt-14">
                <div className="row-between">
                  <div className="muted">Имя</div>
                  <div className="strong">{profile?.name || "—"}</div>
                </div>
                <div className="row-between mt-10">
                  <div className="muted">Телефон</div>
                  <div className="strong">{profile?.phone || "—"}</div>
                </div>
                <div className="row-between mt-10">
                  <div className="muted">Telegram</div>
                  <div className="strong">@{auth?.username || "—"}</div>
                </div>
              </div>
            </>
          )}

          {tab === "history" && (
            <section className="section">
              <h3 className="section-title">История операций</h3>

              {txs.length === 0 ? (
                <div className="card muted">Пока нет операций</div>
              ) : (
                <div className="list">
                  {txs.map((t) => (
                    <div key={t.id} className="card tx">
                      <div>
                        <div className="tx-type">
                          {t.type === "EARN" ? "Начисление" : t.type === "SPEND" ? "Списание" : "Корректировка"}
                        </div>
                        <div className="tx-date">{new Date(t.created_at).toLocaleString()}</div>
                        {t.note ? <div className="tx-note">{t.note}</div> : null}
                      </div>

                      <div className={`tx-amount ${t.amount > 0 ? "pos" : "neg"}`}>
                        {t.amount > 0 ? `+${t.amount}` : t.amount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === "qr" && (
            <section className="section">
              <h3 className="section-title">Ваш QR-код</h3>

              <div className="card">
                <div className="hint">
                  Админ в будущем сможет отсканировать QR и списать баллы.
                </div>

                <div className="qrWrap">
                  {qrDataUrl ? (
                    <img className="qrImg" src={qrDataUrl} alt="QR" />
                  ) : (
                    <div className="muted">Генерируем QR...</div>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="status">{status}</div>
        </div>
      </div>

      {/* bottom nav всегда вне container, чтобы быть full-width */}
      <div className="bottom-nav">
        <button className={`nav-item ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
          👤<span>Профиль</span>
        </button>
        <button className={`nav-item ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          📜<span>История</span>
        </button>
        <button className={`nav-item ${tab === "qr" ? "active" : ""}`} onClick={() => setTab("qr")}>
          📱<span>QR</span>
        </button>
      </div>
    </div>
  );
}

export default App;