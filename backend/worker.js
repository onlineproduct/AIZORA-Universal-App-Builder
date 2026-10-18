const cors = (request, env) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "https://onlineproduct.github.io";
  const allowOrigin = origin === allowed ? origin : allowed;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Access-Code, Authorization, X-Project-Name",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
};
const json = (data, status, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
});
const safeName = value => String(value || "AIZORA-Project").replace(/[^a-zA-Z0-9 _.-]/g, "_").slice(0, 80) || "AIZORA-Project";

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return json({ ok: true, service: "AIZORA Builder API" }, 200, headers);
    if (request.headers.get("Origin") && request.headers.get("Origin") !== (env.ALLOWED_ORIGIN || "https://onlineproduct.github.io")) {
      return json({ error: "Origin not allowed" }, 403, headers);
    }
    if (url.pathname === "/api/build-source" && request.method === "GET") {
      if (!env.BUILD_DOWNLOAD_TOKEN || request.headers.get("Authorization") !== "Bearer " + env.BUILD_DOWNLOAD_TOKEN) {
        return new Response("Unauthorized", { status: 401, headers });
      }
      const buildId = url.searchParams.get("build_id") || "";
      if (!/^[0-9a-f-]{36}$/i.test(buildId)) return new Response("Invalid build_id", { status: 400, headers });
      const object = await env.BUILDS?.get("builds/" + buildId + "/source.zip");
      if (!object) return new Response("Build source not found", { status: 404, headers });
      return new Response(object.body, { status: 200, headers: { ...headers, "content-type": "application/zip", "cache-control": "no-store" } });
    }

    if (request.headers.get("x-app-access-code") !== env.APP_ACCESS_CODE || !env.APP_ACCESS_CODE) {
      return json({ error: "Invalid App Access Code. Worker secret APP_ACCESS_CODE সেট করুন।" }, 401, headers);
    }

    if (url.pathname === "/api/code-ai" && request.method === "POST") {
      if (!env.AI_API_KEY) return json({ error: "AI_API_KEY secret সেট করা হয়নি।" }, 503, headers);
      let input;
      try { input = await request.json(); } catch { return json({ error: "Invalid JSON body" }, 400, headers); }
      const mode = ["generate", "edit", "fix"].includes(input.mode) ? input.mode : "generate";
      const prompt = String(input.prompt || "").slice(0, 12000);
      if (!prompt.trim()) return json({ error: "Prompt খালি রাখা যাবে না।" }, 400, headers);
      const currentFile = input.currentFile && typeof input.currentFile === "object" ? input.currentFile : null;
      const files = Array.isArray(input.files) ? input.files.slice(0, 20).map(f => ({
        path: String(f.path || "").slice(0, 200), content: String(f.content || "").slice(0, 12000)
      })) : [];
      const system = "You are AIZORA Code AI, a careful coding assistant. Return ONLY a valid JSON object with keys filename, code, explanation. code must contain the complete file contents, not markdown fences. Preserve existing behavior unless asked to change it. Never claim that code was built or tested unless that actually happened. For Android APK requests, create valid Android Gradle project source when requested and include necessary Gradle files. Do not output secrets or ask the user to expose API keys.";
      const user = JSON.stringify({ task: mode, instruction: prompt, projectName: String(input.projectName || "AIZORA Project"), currentFile, projectFiles: files });
      let response;
      try {
        response = await fetch(env.AI_API_URL || "https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": "Bearer " + env.AI_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: env.AI_MODEL || "gpt-4o-mini",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: system }, { role: "user", content: user }]
          })
        });
      } catch (e) { return json({ error: "AI provider-এ সংযোগ করা যায়নি: " + e.message }, 502, headers); }
      const raw = await response.text();
      if (!response.ok) return json({ error: "AI provider error (" + response.status + "): " + raw.slice(0, 700) }, 502, headers);
      let parsed;
      try {
        const api = JSON.parse(raw);
        parsed = JSON.parse(api.choices?.[0]?.message?.content || "{}");
      } catch { return json({ error: "AI response JSON হিসেবে পড়া যায়নি।" }, 502, headers); }
      if (typeof parsed.code !== "string" || !parsed.code.trim()) return json({ error: "AI response-এ code নেই।" }, 502, headers);
      return json({ filename: safeName(parsed.filename || (currentFile?.path || "generated.js").split("/").pop()), code: parsed.code, explanation: String(parsed.explanation || "").slice(0, 500) }, 200, headers);
    }

    if (url.pathname === "/api/build-apk" && request.method === "POST") {
      if (!env.BUILDS || !env.GITHUB_TOKEN) return json({ error: "R2 BUILDS binding বা GITHUB_TOKEN secret সেট করা নেই।" }, 503, headers);
      const type = request.headers.get("Content-Type") || "";
      if (!type.includes("application/zip")) return json({ error: "Build source ZIP পাঠাতে হবে।" }, 415, headers);
      const zip = await request.arrayBuffer();
      if (!zip.byteLength || zip.byteLength > 50 * 1024 * 1024) return json({ error: "ZIP খালি বা 50 MB-এর বেশি।" }, 413, headers);
      const buildId = crypto.randomUUID();
      const projectName = safeName(decodeURIComponent(request.headers.get("x-project-name") || "AIZORA-Project"));
      await env.BUILDS.put("builds/" + buildId + "/source.zip", zip, { httpMetadata: { contentType: "application/zip" }, customMetadata: { projectName, createdAt: new Date().toISOString() } });
      const repo = env.GITHUB_REPO || "onlineproduct/AIZORA-Universal-App-Builder";
      const ref = env.BUILD_REF || "main";
      const api = await fetch("https://api.github.com/repos/" + repo + "/actions/workflows/build-user-apk.yml/dispatches", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "AIZORA-Builder" },
        body: JSON.stringify({ ref, inputs: { build_id: buildId, project_name: projectName } })
      });
      if (!api.ok) return json({ error: "GitHub Actions dispatch ব্যর্থ (" + api.status + ")। Workflow default branch-এ আছে কি না এবং token-এর Actions permission পরীক্ষা করুন।" }, 502, headers);
      return json({ ok: true, buildId, actionsUrl: "https://github.com/" + repo + "/actions/workflows/build-user-apk.yml" }, 202, headers);
    }

    return json({ error: "Not found" }, 404, headers);
  }
};
