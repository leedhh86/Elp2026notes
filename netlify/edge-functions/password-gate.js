const COOKIE_NAME = "elp_access";
const SESSION_HOURS = 24;

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(value) {
  const data = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

async function sha256Hex(value) {
  return bytesToHex(await sha256Bytes(value));
}

function constantTimeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const parts = header.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(value) {
  const maxAge = SESSION_HOURS * 60 * 60;
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function safeReturnPath(request) {
  const url = new URL(request.url);
  const candidate = url.searchParams.get("returnTo");
  if (candidate && candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  return "/";
}

function pageHtml({ error = "", configured = true, returnTo = "/" } = {}) {
  const safeError = error
    ? `<div class="error" role="alert">${error}</div>`
    : "";

  const disabled = configured ? "" : "disabled";
  const ownerMessage = configured
    ? ""
    : `<div class="owner-message">This page is not yet configured. The site owner needs to set the <strong>PROTECTED_PAGE_PASSWORD</strong> environment variable.</div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0f2c57">
  <title>ELP 2026 · Enter Access Password</title>
  <style>
    :root{
      color-scheme:light dark;
      --navy:#102c57;
      --green:#1f765e;
      --gold:#e1b43b;
      --paper:#f6f3eb;
      --ink:#14243a;
      --muted:#667386;
      --line:#d7dfe8;
    }
    *{box-sizing:border-box}
    html,body{min-height:100%;margin:0}
    body{
      display:grid;
      place-items:center;
      padding:24px max(18px,env(safe-area-inset-right)) 24px max(18px,env(safe-area-inset-left));
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      color:var(--ink);
      background:
        radial-gradient(circle at 14% 14%,rgba(45,111,167,.14),transparent 29%),
        radial-gradient(circle at 84% 82%,rgba(31,118,94,.12),transparent 32%),
        linear-gradient(145deg,#eef3f6,#f8f4e9);
    }
    .shell{width:min(100%,520px)}
    .card{
      position:relative;
      overflow:hidden;
      border:1px solid rgba(16,44,87,.14);
      border-radius:28px;
      padding:34px 32px 30px;
      background:rgba(255,255,255,.88);
      box-shadow:0 28px 70px rgba(16,44,87,.16);
      backdrop-filter:blur(16px);
    }
    .card::before{
      content:"";
      position:absolute;inset:0 0 auto 0;height:7px;
      background:linear-gradient(90deg,var(--green),#3186b7,var(--gold));
    }
    .mountain{
      position:relative;
      height:84px;
      margin:0 0 8px;
    }
    .mountain svg{width:100%;height:100%;display:block}
    .eyebrow{
      margin-top:8px;
      color:var(--green);
      font-size:.72rem;
      letter-spacing:.17em;
      text-transform:uppercase;
      font-weight:900;
    }
    h1{
      margin:8px 0 7px;
      color:var(--navy);
      font-size:clamp(2rem,7vw,3rem);
      line-height:.98;
      letter-spacing:-.045em;
    }
    .sub{
      margin:0 0 24px;
      color:var(--muted);
      line-height:1.5;
    }
    label{
      display:block;
      margin:0 0 8px;
      color:var(--navy);
      font-size:.85rem;
      font-weight:850;
    }
    .password-row{display:flex;gap:8px}
    input{
      width:100%;
      min-width:0;
      height:50px;
      padding:0 14px;
      border:1px solid #cfd8e3;
      border-radius:14px;
      background:#fff;
      color:#17273d;
      font-size:16px;
      outline:none;
      transition:.15s ease;
    }
    input:focus{
      border-color:#2d70a8;
      box-shadow:0 0 0 4px rgba(45,112,168,.12);
    }
    button{
      height:50px;
      flex:0 0 auto;
      padding:0 18px;
      border:0;
      border-radius:14px;
      background:linear-gradient(135deg,var(--navy),#245b87);
      color:#fff;
      font-size:.9rem;
      font-weight:850;
      cursor:pointer;
      box-shadow:0 8px 20px rgba(16,44,87,.18);
    }
    button:disabled{opacity:.45;cursor:not-allowed}
    .error,.owner-message{
      margin:12px 0 0;
      padding:10px 12px;
      border-radius:12px;
      font-size:.84rem;
      line-height:1.4;
    }
    .error{
      border:1px solid #e5a4a4;
      background:#fff0f0;
      color:#972e32;
    }
    .owner-message{
      border:1px solid #dfc46b;
      background:#fff8dc;
      color:#725b0b;
    }
    .foot{
      margin-top:20px;
      display:flex;
      align-items:center;
      gap:9px;
      color:#7c8796;
      font-size:.76rem;
    }
    .lock{
      width:27px;height:27px;border-radius:50%;
      display:grid;place-items:center;
      background:#edf5f1;color:var(--green);font-weight:900;
    }
    @media(prefers-color-scheme:dark){
      :root{--ink:#ecf3fb;--muted:#aab7c7;--line:#314156}
      body{
        background:
          radial-gradient(circle at 14% 14%,rgba(45,111,167,.15),transparent 30%),
          radial-gradient(circle at 84% 82%,rgba(31,118,94,.11),transparent 32%),
          linear-gradient(145deg,#09111a,#0e1722);
      }
      .card{
        background:rgba(16,25,37,.92);
        border-color:#2b3b50;
        box-shadow:0 28px 70px rgba(0,0,0,.42);
      }
      h1,label{color:#eef5ff}
      input{background:#111d2b;border-color:#33465d;color:#eef5ff}
      .error{background:#34191b;border-color:#703338;color:#ffc7c7}
      .owner-message{background:#332c15;border-color:#6d5c20;color:#ffedaa}
      .lock{background:#173229;color:#70dbac}
    }
    @media(max-width:520px){
      body{padding-top:max(18px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}
      .card{padding:27px 20px 24px;border-radius:22px}
      .password-row{display:grid;grid-template-columns:1fr}
      button{width:100%}
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <div class="mountain" aria-hidden="true">
        <svg viewBox="0 0 480 95">
          <path d="M18 82 L110 26 L158 57 L234 15 L318 68 L370 39 L460 82" fill="none" stroke="#2d70a8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M80 82 Q180 49 260 82 T445 82" fill="none" stroke="#1f765e" stroke-width="3" stroke-linecap="round"/>
          <path d="M225 17 L225 3 L245 8 L225 13" fill="#e1b43b" stroke="#102c57" stroke-width="2"/>
        </svg>
      </div>
      <div class="eyebrow">ELP 2026 · Leadership Development Reference</div>
      <h1>Welcome back.</h1>
      <p class="sub">Enter the shared access password to open the reference.</p>
      ${ownerMessage}
      <form method="post">
        <input type="hidden" name="returnTo" value="${returnTo.replace(/"/g, "&quot;")}">
        <label for="password">Access password</label>
        <div class="password-row">
          <input id="password" name="password" type="password" autocomplete="current-password" required ${disabled} autofocus>
          <button type="submit" ${disabled}>Enter</button>
        </div>
        ${safeError}
      </form>
      <div class="foot"><span class="lock">✓</span><span>Shared access · session remembered for 24 hours</span></div>
    </section>
  </main>
</body>
</html>`;
}

function htmlResponse(html, status = 200, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

export default async (request, context) => {
  const configuredPassword = Netlify.env.get("PROTECTED_PAGE_PASSWORD");
  const url = new URL(request.url);

  // Never fail open if the environment variable is missing.
  if (!configuredPassword) {
    return htmlResponse(pageHtml({ configured: false }), 503);
  }

  const expectedSession = await sha256Hex(`ELP_SESSION_V1|${configuredPassword}`);

  // Explicit logout invalidates the current browser session.
  if (url.searchParams.get("logout") === "1") {
    return htmlResponse(pageHtml({ returnTo: "/" }), 200, {
      "set-cookie": clearSessionCookie(),
    });
  }

  const session = getCookie(request, COOKIE_NAME);
  if (session) {
    const a = new TextEncoder().encode(session);
    const b = new TextEncoder().encode(expectedSession);
    if (constantTimeEqual(a, b)) {
      return context.next();
    }
  }

  if (request.method === "POST") {
    let form;
    try {
      form = await request.formData();
    } catch {
      return htmlResponse(pageHtml({ error: "Unable to read the password submission." }), 400);
    }

    const submitted = String(form.get("password") || "");
    const returnToRaw = String(form.get("returnTo") || "/");
    const returnTo = returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") ? returnToRaw : "/";

    const submittedHash = await sha256Bytes(submitted);
    const expectedHash = await sha256Bytes(configuredPassword);

    if (constantTimeEqual(submittedHash, expectedHash)) {
      // Netlify can briefly resolve `/` before the SPA rewrite immediately
      // after the auth POST. Send root logins to the concrete entry file so
      // the first authenticated navigation cannot fall through to a 404.
      const authenticatedReturnTo = returnTo === "/" ? "/index.html" : returnTo;
      return new Response(null, {
        status: 303,
        headers: {
          "location": authenticatedReturnTo,
          "set-cookie": sessionCookie(expectedSession),
          "cache-control": "no-store, max-age=0",
        },
      });
    }

    return htmlResponse(pageHtml({
      error: "That password wasn’t recognised. Please try again.",
      returnTo,
    }), 401);
  }

  const returnTo = `${url.pathname}${url.search}`;
  return htmlResponse(pageHtml({ returnTo }));
};
