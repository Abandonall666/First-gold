// 声明Edge运行时，修复Vercel流式吞流空白
export const config = {
  runtime: "edge",
  maxDuration: 60
};

export default async function handler(req) {
  const resHeaders = new Headers();
  // 跨域处理
  resHeaders.set("Access-Control-Allow-Origin", "*");
  resHeaders.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  resHeaders.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: resHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "仅支持POST请求" }), {
      status: 405,
      headers: resHeaders
    });
  }

  // 从Vercel环境变量读取密钥，不要写死代码
  const API_PASSWORD = process.env.SPARK_API_PASSWORD;
  const targetUrl = "https://spark-api-open.xf-yun.com/x2/chat/completions";

  if (!API_PASSWORD) {
    return new Response(`data: {"error":"未配置SPARK_API_PASSWORD环境变量"}\n\n`, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  }

  try {
    const body = await req.json();
    const payload = {
      model: "spark-x",
      messages: body.messages,
      stream: true,
      temperature: body.temperature ?? 0.7,
      extra_body: { thinking: { type: "disabled" } }
    };

    const aiRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_PASSWORD}`
      },
      body: JSON.stringify(payload)
    });

    // SSE流式响应头
    const streamHeaders = new Headers(resHeaders);
    streamHeaders.set("Content-Type", "text/event-stream; charset=utf-8");
    streamHeaders.set("Cache-Control", "no-cache, no-transform");
    streamHeaders.set("Connection", "keep-alive");
    streamHeaders.set("X-Content-Type-Options", "nosniff");

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(`data: {"error":"讯飞接口${aiRes.status}：${errText}"}\n\n`, {
        headers: streamHeaders
      });
    }

    // 直接透传讯飞原始流，解决空白
    return new Response(aiRes.body, { headers: streamHeaders });

  } catch (err) {
    return new Response(`data: {"error":"服务异常：${err.message}"}\n\n`, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform"
      }
    });
  }
}
