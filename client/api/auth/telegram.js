const crypto = require("crypto");

function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const data = {};
  for (const [k, v] of params.entries()) data[k] = v;
  return data;
}

function checkTelegramInitData(initData, botToken) {
  const data = parseInitData(initData);
  const receivedHash = data.hash;
  if (!receivedHash) return { ok: false };

  const keys = Object.keys(data).filter((k) => k !== "hash").sort();
  const dataCheckString = keys.map((k) => `${k}=${data[k]}`).join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const ok =
    calculatedHash.length === receivedHash.length &&
    crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(receivedHash));

  return { ok, data };
}

function isAdmin(tgId, adminList) {
  const set = new Set(
    (adminList || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return set.has(String(tgId));
}

module.exports = (req, res) => {
  // preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return res.status(500).json({ ok: false, error: "NO_BOT_TOKEN" });

  const { initData } = req.body || {};
  if (!initData) return res.status(400).json({ ok: false, error: "NO_INIT_DATA" });

  const result = checkTelegramInitData(initData, botToken);
  if (!result.ok) return res.status(401).json({ ok: false, error: "BAD_SIGNATURE" });

  let user = null;
  try {
    user = result.data.user ? JSON.parse(result.data.user) : null;
  } catch {}

  if (!user?.id) return res.status(400).json({ ok: false, error: "NO_USER" });

  return res.json({
    ok: true,
    profile: {
      telegramId: user.id,
      username: user.username || null,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      isAdmin: isAdmin(user.id, process.env.ADMIN_TG_IDS || ""),
      balance: 0
    }
  });
};