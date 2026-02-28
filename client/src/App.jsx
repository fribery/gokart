import React, { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "framer-motion";
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

  const [admin, setAdmin] = useState({
    targetTelegramId: "",
    amount: "",
    note: "",
  });

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
    return JSON.stringify({
      v: 1,
      telegramId: auth.telegramId,
      ts: Date.now(),
      kind: "gokart_user",
    });
  }, [auth?.telegramId]);

  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function make() {
      if (!qrPayload) return;
      const url = await QRCode.toDataURL(qrPayload, { margin: 1, width: 300 });
      if (!cancelled) setQrDataUrl(url);
    }
    make().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  // admin helpers
  const onAdminChange = (key) => (e) =>
    setAdmin((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));

  async function adminEarn() {
    try {
      setStatus("Админ: начисление...");
      const response = await api("/api/admin/earn", {
        initData: WebApp.initData,
        targetTelegramId: Number(admin.targetTelegramId),
        amount: Number(admin.amount),
        note: admin.note,
      });

      if (!response.ok) {
        setStatus(`Ошибка: ${response.error}${response.details ? " | " + response.details : ""}`);
        return;
      }

      await refreshAll();
      setStatus("Готово");
      try {
        WebApp.hapticFeedback?.notificationOccurred?.("success");
      } catch {}
    } catch (error) {
      setStatus("Ошибка: " + String(error?.message || error));
    }
  }

  async function adminSpend() {
    try {
      setStatus("Админ: списание...");
      const response = await api("/api/admin/spend", {
        initData: WebApp.initData,
        targetTelegramId: Number(admin.targetTelegramId),
        amount: Number(admin.amount),
        note: admin.note,
      });

      if (!response.ok) {
        setStatus(
          `Ошибка: ${response.error}${response.details ? " | " + response.details : ""}${
            response.balance != null ? " | balance=" + response.balance : ""
          }`
        );
        try {
          WebApp.hapticFeedback?.notificationOccurred?.("error");
        } catch {}
        return;
      }

      await refreshAll();
      setStatus("Готово");
      try {
        WebApp.hapticFeedback?.notificationOccurred?.("success");
      } catch {}
    } catch (error) {
      setStatus("Ошибка: " + String(error?.message || error));
    }
  }

  // animations
  const screenVariants = {
    initial: { opacity: 0, y: 10, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.22 } },
    exit: { opacity: 0, y: -8, filter: "blur(2px)", transition: { duration: 0.18 } },
  };

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
        <Header title="GoKart" subtitle="Запусти мини-апп в Telegram" />
        <Card>
          <div className="muted">{status}</div>
        </Card>
      </Page>
    );
  }

  if (needsRegistration) {
    const canRegister =
      form.agree && form.name.trim().length >= 2 && form.phone.trim().length >= 8;

    return (
      <Page>
        <Header title="Регистрация" subtitle="Залетаем в лигу: +200 баллов 🎁" />

        <Card>
          <div className="field">
            <div className="label">Имя</div>
            <input
              className="input"
              placeholder="Например, Eugene"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <div className="label">Телефон</div>
            <input
              className="input"
              placeholder="+7 999 123-45-67"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <label className="check">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => setForm((p) => ({ ...p, agree: e.target.checked }))}
            />
            <span>Согласен с правилами программы</span>
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
              try {
                WebApp.showPopup({
                  title: "Готово",
                  message: "Регистрация сохранена. +200 баллов 🎁",
                });
                WebApp.hapticFeedback?.notificationOccurred?.("success");
              } catch {}
            }}
          >
            Стартовать
          </button>
        </Card>

        <Status status={status} />
      </Page>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="content">
          <div className="topbar">
            <Header
              title="GoKart"
              subtitle={
                profile?.name
                  ? `Пилот: ${profile.name}`
                  : auth?.firstName
                  ? `Пилот: ${auth.firstName}`
                  : "Пилот"
              }
              right={
                <button
                  className="btn btn-ghost"
                  onClick={() => refreshAll().catch(() => {})}
                  aria-label="refresh"
                >
                  ⟳
                </button>
              }
            />
          </div>

          <AnimatePresence mode="wait">
            {tab === "profile" && (
              <motion.div
                key="profile"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Card className="card-balance">
                  <div className="row-between">
                    <div>
                      <div className="muted">Баланс</div>
                      <div className="balance">{balance}</div>
                      <div className="balance-sub">баллов</div>
                    </div>
                    <div className="badge">
                      <span className="badge-dot" />
                      ACTIVE
                    </div>
                  </div>

                  <div className="meter">
                    <div
                      className="meter-fill"
                      style={{
                        width: `${Math.min(100, Math.max(8, (balance / 1000) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="mini-hint">Подсказка: 1000 = следующая “лига” (позже сделаем уровни).</div>
                </Card>

                <Card className="mt-14">
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
                </Card>

                {auth?.isAdmin && (
                  <Card className="mt-14">
                    <div className="section-head">
                      <div>
                        <div className="section-title">Админ панель</div>
                        <div className="hint">Начисление/списание по telegramId</div>
                      </div>
                      <div className="pill">ADMIN</div>
                    </div>

                    <div className="field">
                      <div className="label">telegramId клиента</div>
                      <input
                        className="input"
                        inputMode="numeric"
                        placeholder="например 589918672"
                        value={admin.targetTelegramId}
                        onChange={onAdminChange("targetTelegramId")}
                      />
                    </div>

                    <div className="field">
                      <div className="label">Сумма</div>
                      <input
                        className="input"
                        inputMode="numeric"
                        placeholder="например 200"
                        value={admin.amount}
                        onChange={onAdminChange("amount")}
                      />
                    </div>

                    <div className="field">
                      <div className="label">Комментарий</div>
                      <input
                        className="input"
                        placeholder="опционально"
                        value={admin.note}
                        onChange={onAdminChange("note")}
                      />
                    </div>

                    <div className="row">
                      <button className="btn btn-primary" onClick={adminEarn}>
                        + Начислить
                      </button>
                      <button className="btn btn-secondary" onClick={adminSpend}>
                        − Списать
                      </button>
                    </div>
                  </Card>
                )}
              </motion.div>
            )}

            {tab === "history" && (
              <motion.div
                key="history"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="section-head">
                  <div>
                    <div className="section-title">История</div>
                    <div className="hint">Все движения по счету</div>
                  </div>
                  <div className="pill">{txs.length}</div>
                </div>

                {txs.length === 0 ? (
                  <Card>
                    <div className="muted">Пока нет операций</div>
                  </Card>
                ) : (
                  <div className="list">
                    {txs.map((t) => (
                      <motion.div
                        key={t.id}
                        className="card tx"
                        layout
                        whileTap={{ scale: 0.98 }}
                      >
                        <div>
                          <div className="tx-type">
                            {t.type === "EARN"
                              ? "Начисление"
                              : t.type === "SPEND"
                              ? "Списание"
                              : "Корректировка"}
                          </div>
                          <div className="tx-date">{new Date(t.created_at).toLocaleString()}</div>
                          {t.note ? <div className="tx-note">{t.note}</div> : null}
                        </div>

                        <div className={`tx-amount ${t.amount > 0 ? "pos" : "neg"}`}>
                          {t.amount > 0 ? `+${t.amount}` : t.amount}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "qr" && (
              <motion.div
                key="qr"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="section-head">
                  <div>
                    <div className="section-title">QR-код</div>
                    <div className="hint">Покажи администратору на кассе</div>
                  </div>
                  <div className="pill">SCAN</div>
                </div>

                <Card>
                  <div className="qrWrap">
                    {qrDataUrl ? (
                      <img className="qrImg" src={qrDataUrl} alt="QR" />
                    ) : (
                      <div className="muted">Генерируем QR…</div>
                    )}
                  </div>

                  <div className="qrHint">
                    В будущем заменим на одноразовый защищённый токен (анти-скриншот / анти-подделка).
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Status status={status} />
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ title, subtitle, right }) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="brand">
          <span className="brand-mark" />
          <div className="brand-text">
            <div className="title">{title}</div>
            <div className="subtitle">{subtitle}</div>
          </div>
        </div>
      </div>
      <div className="header-right">{right}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`card ${className}`}>{children}</div>;
}

function Status({ status }) {
  return <div className="status">{status}</div>;
}

function BottomNav({ tab, setTab }) {
  const Item = ({ id, icon, label }) => (
    <button
      className={`nav-item ${tab === id ? "active" : ""}`}
      onClick={() => setTab(id)}
    >
      <span className="nav-ic">{icon}</span>
      <span className="nav-tx">{label}</span>
      {tab === id ? <span className="nav-active" /> : null}
    </button>
  );

  return (
    <div className="bottom-nav">
      <Item id="profile" icon="🏁" label="Профиль" />
      <Item id="history" icon="🧾" label="История" />
      <Item id="qr" icon="📟" label="QR" />
    </div>
  );
}

export default App;