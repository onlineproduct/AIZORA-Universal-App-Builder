const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const TARGET_REPOSITORY = "onlineproduct/AIZORA-Universal-App-Builder";
const TARGET_BRANCH = "main";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!env.APP_ORIGIN || origin !== env.APP_ORIGIN) {
    throw new Error("Origin is not allowed. Configure APP_ORIGIN to the exact Builder URL.");
  }
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem) {
  const isPkcs1 = pem.includes("-----BEGIN RSA PRIVATE KEY-----");
  const clean = pem.replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----|-----END (?:RSA )?PRIVATE KEY-----|\s/g, "");
  const binary = atob(clean);
  const raw = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (!isPkcs1) return raw;
  const lengthBytes = (length) => {
    if (length < 128) return Uint8Array.of(length);
    const bytes = [];
    while (length > 0) { bytes.unshift(length & 255); length >>>= 8; }
    return Uint8Array.from([0x80 | bytes.length, ...bytes]);
  };
  const tlv = (tag, value) => {
    const len = lengthBytes(value.length);
    const result = new Uint8Array(1 + len.length + value.length);
    result[0] = tag; result.set(len, 1); result.set(value, 1 + len.length);
    return result;
  };
  const algorithm = Uint8Array.from([0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00]);
  const version = Uint8Array.from([0x02,0x01,0x00]);
  const privateKey = tlv(0x04, raw);
  const body = new Uint8Array(version.length + algorithm.length + privateKey.length);
  body.set(version, 0);
  body.set(algorithm, version.length);
  body.set(privateKey, version.length + algorithm.length);
  return tlv(0x30, body);
}

async function createAppJwt(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    iat: now - 60,
    exp: now + 540,
    iss: String(env.GITHUB_APP_ID),
  })));
  const unsigned = header + "." + payload;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(env.GITHUB_APP_PRIVATE_KEY),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return unsigned + "." + base64Url(new Uint8Array(signature));
}

async function githubApi(path, token, options = {}) {
  const response = await fetch(GITHUB_API + path, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: "Bearer " + token,
      "x-github-api-version": GITHUB_API_VERSION,
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 500) }; }
  if (!response.ok) throw new Error("GitHub API " + response.status + ": " + (data.message || "request failed"));
  return data;
}

async function userForToken(token) {
  const response = await fetch(GITHUB_API + "/user", {
    headers: { accept: "application/vnd.github+json", authorization: "Bearer " + token },
  });
  if (!response.ok) throw new Error("GitHub authorization is invalid or expired.");
  return response.json();
}

async function installationToken(env) {
  const jwt = await createAppJwt(env);
  const result = await githubApi(
    "/app/installations/" + encodeURIComponent(env.GITHUB_INSTALLATION_ID) + "/access_tokens",
    jwt,
    { method: "POST", body: "{}" },
  );
  return result.token;
}

function safeSlug(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,49}$/.test(value);
}

async function uploadProject(request, env, slug, userToken) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > Math.ceil(MAX_TOTAL_BYTES * 1.4) + 1024 * 1024) {
    throw new Error("Upload request exceeds the 50 MiB project limit.");
  }
  const user = await userForToken(userToken);
  if (!env.ALLOWED_GITHUB_LOGIN || user.login.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN.toLowerCase()) {
    throw new Error("This GitHub account is not allowed to upload to the configured project repository.");
  }
  if (!safeSlug(slug)) throw new Error("Invalid project name.");
  const body = await request.json();
  if (!body || !Array.isArray(body.files) || body.files.length < 2 || body.files.length > MAX_FILES) {
    throw new Error("Upload must contain between 2 and " + MAX_FILES + " files.");
  }
  const normalized = [];
  let total = 0;
  for (const file of body.files) {
    if (!file || typeof file.path !== "string" || typeof file.contentBase64 !== "string") {
      throw new Error("Invalid file entry.");
    }
    const path = file.path.replace(/^\/+/, "");
    const parts = path.split("/");
    const lowerPath = path.toLowerCase();
    const secretLike = parts.some((part) => part === ".git" || part === ".env" || part.startsWith(".env.") || part === "key.properties") ||
      /\.(pem|p12|pfx|jks|keystore)$/.test(lowerPath);
    if (!path || parts.some((part) => !part || part === "." || part === "..") ||
        !/^[a-zA-Z0-9._/-]+$/.test(path) || secretLike) {
      throw new Error("Unsafe project file path: " + path);
    }
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.contentBase64)) {
      throw new Error("Invalid base64 content for " + path);
    }
    const bytes = Math.floor(file.contentBase64.length * 3 / 4) - (file.contentBase64.endsWith("==") ? 2 : file.contentBase64.endsWith("=") ? 1 : 0);
    total += bytes;
    if (total > MAX_TOTAL_BYTES) throw new Error("Project exceeds the 50 MiB upload limit.");
    normalized.push({ path, contentBase64: file.contentBase64 });
  }
  const paths = new Set(normalized.map((f) => f.path));
  if (!paths.has("pubspec.yaml") || !paths.has("lib/main.dart")) {
    throw new Error("Project must include pubspec.yaml and lib/main.dart.");
  }

  const repo = TARGET_REPOSITORY;
  const branch = TARGET_BRANCH;
  const root = "projects/" + slug + "/flutter/";
  const token = await installationToken(env);
  const ref = await githubApi("/repos/" + repo + "/git/ref/heads/" + encodeURIComponent(branch), token);
  const baseCommit = await githubApi("/repos/" + repo + "/git/commits/" + ref.object.sha, token);
  const entries = [];
  for (const file of normalized) {
    const blob = await githubApi("/repos/" + repo + "/git/blobs", token, {
      method: "POST",
      body: JSON.stringify({ content: file.contentBase64, encoding: "base64" }),
    });
    entries.push({ path: root + file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await githubApi("/repos/" + repo + "/git/trees", token, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: entries }),
  });
  const commit = await githubApi("/repos/" + repo + "/git/commits", token, {
    method: "POST",
    body: JSON.stringify({
      message: "Add/update AIZORA Builder project: " + slug,
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });
  await githubApi("/repos/" + repo + "/git/refs/heads/" + encodeURIComponent(branch), token, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return {
    ok: true,
    login: user.login,
    commit_sha: commit.sha,
    project_dir: root.slice(0, -1),
    actions_url: "https://github.com/" + repo + "/actions",
    files_uploaded: normalized.length,
  };
}

export default {
  async fetch(request, env) {
    let cors;
    try { cors = corsHeaders(request, env); }
    catch (error) { return json({ error: error.message }, 403); }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "AIZORA GitHub Upload Bridge" }, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/auth/device-code") {
        const deviceForm = new URLSearchParams({ client_id: env.GITHUB_OAUTH_CLIENT_ID, scope: "read:user" });
        const response = await fetch("https://github.com/login/device/code", {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
          body: deviceForm.toString(),
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error_description || data.error || "Could not start GitHub sign-in.");
        return json(data, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/auth/access-token") {
        const body = await request.json();
        const tokenForm = new URLSearchParams({
          client_id: env.GITHUB_OAUTH_CLIENT_ID,
          device_code: body.device_code,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        });
        const response = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
          body: tokenForm.toString(),
        });
        const data = await response.json();
        if (data.error) return json({ error: data.error, error_description: data.error_description, interval: data.interval }, 202, cors);
        if (!response.ok || !data.access_token) throw new Error("GitHub sign-in failed.");
        const user = await userForToken(data.access_token);
        if (!env.ALLOWED_GITHUB_LOGIN || user.login.toLowerCase() !== env.ALLOWED_GITHUB_LOGIN.toLowerCase()) {
          return json({ error: "This GitHub account is not allowed." }, 403, cors);
        }
        return json({ ok: true, login: user.login, access_token: data.access_token }, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/auth/logout") {
        return json({ ok: true }, 200, cors);
      }
      const match = url.pathname.match(/^\/api\/projects\/([a-z0-9][a-z0-9_-]{0,49})\/upload$/);
      if (request.method === "POST" && match) {
        const authorization = request.headers.get("Authorization") || "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!token) return json({ error: "GitHub is not connected. Connect GitHub again." }, 401, cors);
        const result = await uploadProject(request, env, match[1], token);
        return json(result, 200, cors);
      }
      return json({ error: "Not found" }, 404, cors);
    } catch (error) {
      return json({ error: error.message || "Unexpected upload error" }, 400, cors);
    }
  },
};
