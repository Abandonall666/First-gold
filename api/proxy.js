export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "仅POST访问" });
  }

  // 填写你的讯飞密钥
  const APP_ID = "bb443d11";
  const API_KEY = "34ce6d0aa22e77ac66eee704ac92050b";
  const API_SECRET = "OGEwZDAyOGJjZmJkMTczNjllZjBlOGM3";
  const targetUrl = "https://spark-api-open.xf-yun.com/x2/chat/completions";

  try {
    const body = req.body;
    // SSE强制全套头部，Vercel必须写死
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Content-Type-Options": "nosniff"
    });

    const payload = {
      model: "spark-x",
      messages: body.messages,
      stream: true,
      temperature: body.temperature ?? 0.7,
      extra_body: { thinking: { type: "disabled" } }
    };

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APP_ID}:${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      res.write(`data: {"error":"讯飞接口错误${response.status}"}\n\n`);
      res.end();
      return;
    }

    // 逐段实时下发，不缓存，解决Vercel吞流空白
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      res.write(text);
    }
    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    res.write(`data: {"error":"服务异常：${err.message}"}\n\n`);
    res.end();
  }
}
