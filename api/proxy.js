export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "仅支持POST请求" });
  }

  // ========= 替换你的讯飞密钥 =========
  const APP_ID = "bb443d11";
  const API_KEY = "34ce6d0aa22e77ac66eee704ac92050b";
  const API_SECRET = "OGEwZDAyOGJjZmJkMTczNjllZjBlOGM3";
  // ====================================

  // X2专属接口地址
  const SPARK_URL = "https://spark-api-open.xf-yun.com/v2/chat/completions";

  try {
    const body = req.body;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const payload = {
      model: "spark-x",
      messages: body.messages,
      stream: body.stream ?? true,
      temperature: body.temperature || 0.7,
      extra_body: {
        thinking: { type: "enabled" }
      }
    };

    const aiRes = await fetch(SPARK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APP_ID}:${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    if (!aiRes.ok) {
      const errMsg = await aiRes.text();
      res.write(`data: {"error":"讯飞接口异常${aiRes.status}：${errMsg}"}\n\n`);
      return res.end();
    }

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder("utf-8", { stream: true });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }
    res.end();

  } catch (err) {
    res.write(`data: {"error":"代理异常：${err.message}"}\n\n`);
    res.end();
  }
}
