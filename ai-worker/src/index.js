export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
    const originAllowed = !origin || allowed.length === 0 || allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": origin && allowed.length && allowed.includes(origin) ? origin : (allowed.length ? allowed[0] : "*"),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!originAllowed) return json({ error: "Origin not allowed" }, 403, cors);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, configured: Boolean(env.AI_API_KEY && env.AI_MODEL), provider: env.AI_API_URL ? "custom-compatible" : "openrouter" }, 200, cors);
    }
    if (url.pathname !== "/api/generate") return json({ error: "Not found" }, 404, cors);
    if (request.method !== "POST") return json({ error: "Use POST" }, 405, cors);
    if (!env.AI_API_KEY) return json({ error: "AI_API_KEY secret is not configured in Cloudflare Worker" }, 503, cors);
    if (!env.AI_MODEL) return json({ error: "AI_MODEL variable is not configured in Worker settings" }, 503, cors);
    let input;
    try { input = await request.json(); } catch { return json({ error: "Request body must be valid JSON" }, 400, cors); }
    const task = typeof input.task === "string" ? input.task.trim() : "";
    const source = typeof input.source === "string" ? input.source.slice(0, 30000) : "";
    const mode = ["generate", "fix", "explain"].includes(input.mode) ? input.mode : "generate";
    const language = typeof input.language === "string" ? input.language.slice(0, 80) : "other";
    if (!task) return json({ error: "কাজের নির্দেশ লিখুন" }, 400, cors);
    if (task.length > 6000) return json({ error: "নির্দেশ ৬০০০ অক্ষরের মধ্যে রাখুন" }, 413, cors);
    const system = "You are AIZORA Universal App Builder's coding assistant. Follow the user's language, especially Bengali. Return practical code or a clear explanation. For generate/fix tasks, return the final code only, without Markdown fences, unless the user explicitly asks for explanation. Never claim code was executed or tested unless it actually was. Do not reveal secrets.";
    const prompt = [
      "Mode: " + mode,
      "Requested language: " + language,
      "Project: " + String(input.projectName || "Untitled").slice(0, 120),
      "User task: " + task,
      source ? "Existing source code:\n" + source : ""
    ].filter(Boolean).join("\n\n");
    const apiUrl = env.AI_API_URL || "https://openrouter.ai/api/v1/chat/completions";
    let upstream;
    try {
      upstream = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.AI_API_KEY,
          "Content-Type": "application/json",
          ...(apiUrl.includes("openrouter.ai") ? { "HTTP-Referer": "https://github.com/onlineproduct/AIZORA-Universal-App-Builder", "X-Title": "AIZORA Universal App Builder" } : {})
        },
        body: JSON.stringify({
          model: env.AI_MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 5000
        })
      });
    } catch { return json({ error: "AI provider-এর সঙ্গে সংযোগ করা যায়নি" }, 502, cors); }
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || ("AI provider HTTP " + upstream.status);
      return json({ error: String(message).slice(0, 500) }, 502, cors);
    }
    const result = data?.choices?.[0]?.message?.content;
    if (typeof result !== "string" || !result.trim()) return json({ error: "AI provider খালি ফলাফল দিয়েছে" }, 502, cors);
    return json({ result: result.trim(), model: env.AI_MODEL }, 200, cors);
  }
};
function json(value, status, headers = {}) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
