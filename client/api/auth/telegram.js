// client/api/auth/telegram.js
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
  if (!receivedHash) return { ok: false, error: "NO_HASH" };

  const keys = Object.keys(data).filter((k) => k !== "hash").sort();
  const dataCheckString = keys.map((k) => `${k}=${data[k]}`).join("\n");

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // calculated_hash = HMAC_SHA256(data_check_string, secret_key)
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash.length !== receivedHash.length) {
    return { ok: false, error: "HASH_LENGTH_MISMATCH" };
  }

  const ok = crypto.timingSafeEqual(
    Buffer.from(calculatedHash, "utf8"),
    Buffer.from(receivedHash, "utf8")
  );

  return { ok, data, error: ok ? null : "BAD_SIGNATURE" };
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

module.exports = async (req, res) => {
  // Гарантируем JSON-ответ, чтобы фронт не падал на HTML
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    if (req.method === "OPTIONS") {
      return res.status(200).end(JSON.stringify({ ok: true }));
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .end(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }));
    }

    const botToken = process.env.BOT_TOKEN;
    const adminIds = process.env.ADMIN_TG_IDS || "";

    if (!botToken) {
      return res
        .status(500)
        .end(JSON.stringify({ ok: false, error: "NO_BOT_TOKEN" }));
    }

    // На Vercel body может быть объектом или строкой
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = null;
      }
    }

    const initData = body?.initData;
    if (!initData) {
      return res
        .status(400)
        .end(JSON.stringify({ ok: false, error: "NO_INIT_DATA" }));
    }

    const check = checkTelegramInitData(initData, botToken);
    if (!check.ok) {
      return res
        .status(401)
        .end(JSON.stringify({ ok: false, error: check.error || "BAD_SIGNATURE" }));
    }

    let user = null;
    try {
      user = check.data.user ? JSON.parse(check.data.user) : null;
    } catch {
      user = null;
    }

    if (!user?.id) {
      return res
        .status(400)
        .end(JSON.stringify({ ok: false, error: "NO_USER" }));
    }

    const profile = {
      telegramId: user.id,
      username: user.username || null,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      isAdmin: isAdmin(user.id, adminIds),
      balance: 0,
    };

    return res.status(200).end(JSON.stringify({ ok: true, profile }));
  } catch (err) {
    // Самое важное: даже при падении — JSON, а не HTML
    return res
      .status(500)
      .end(
        JSON.stringify({
          ok: false,
          error: "INTERNAL_ERROR",
          details: String(err?.message || err),
        })
      );
  }
};