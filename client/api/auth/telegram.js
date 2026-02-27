module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    // покажем базовую инфу, НЕ раскрывая токены
    const botTokenPresent = Boolean(process.env.BOT_TOKEN);
    const adminIdsPresent = Boolean(process.env.ADMIN_TG_IDS);

    // body в Vercel может быть объектом/строкой/undefined
    let body = req.body;
    const bodyType = typeof body;

    if (bodyType === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // не падаем
      }
    }

    const initData = body?.initData;
    const initDataType = typeof initData;
    const initDataLen = typeof initData === "string" ? initData.length : 0;
    const initDataPreview =
      typeof initData === "string" ? initData.slice(0, 80) : null; // первые 80 символов, безопасно

    return res.status(200).end(
      JSON.stringify({
        ok: true,
        debug: {
          method: req.method,
          botTokenPresent,
          adminIdsPresent,
          bodyType,
          initDataType,
          initDataLen,
          initDataPreview,
        },
      })
    );
  } catch (e) {
    return res
      .status(200)
      .end(JSON.stringify({ ok: false, debugError: String(e?.message || e) }));
  }
};