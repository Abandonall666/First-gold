export default async function handler(req, res) {
  // 跨域预检
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "仅POST请求" });

  // ========= 在这里替换你讯飞星火控制台密钥 =========
  const APP_ID = "你的讯飞APPID";
  const API_KEY = "你的API_KEY";
  const API_SECRET = "你的API_SECRET";
  // =====================================================

  try {
    const body = req.body;
    // 讯飞兼容OpenAI接口地址
    const url = "https://spark-api.xf-yun.com/v1/chat/completions";

    // 组装请求体，兼容前端原有格式
    const payload = {
      model: "generalv3.5",
      messages: body.messages,
      stream: body.stream ?? true,
      temperature: body.temperature || 0.7
    };

    // 请求讯飞官方接口
    const aiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APP_ID}:${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    // SSE流式头部，打字机必备
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 数据流原样透传转发到前端
    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (err) {
    res.write(`data: {"error":"调用讯飞接口失败，请检查密钥余额"}\n\n`);
    res.end();
  }
}
