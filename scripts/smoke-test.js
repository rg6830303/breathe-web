/**
 * Smoke test for the new endpoints + pages added in groups 1-7.
 *
 * Run with:
 *   1. npm run dev (in another terminal, wait for "Ready in...")
 *   2. node scripts/smoke-test.js
 *
 * Pass BASE_URL=https://breathe-web-six.vercel.app to hit prod (some endpoints
 * will refuse anonymous traffic; that's expected — we check for status codes,
 * not bodies).
 */

const http = require("http");
const https = require("https");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json", ...headers },
    };
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const c of cookies) {
    for (const p of c.split(";")) {
      const t = p.trim();
      if (t.startsWith(name + "=")) return t.substring(name.length + 1);
    }
  }
  return null;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`=== Smoke test against ${BASE_URL} ===\n`);

  // 1. Public pages
  for (const path of [
    "/",
    "/about",
    "/coaching",
    "/tournaments",
    "/gallery",
    "/contact",
    "/book",
    "/calendar",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/admin/login",
  ]) {
    const r = await request("GET", path);
    check(`GET ${path}`, r.statusCode === 200, `status ${r.statusCode}`);
  }

  // 1b. Email health probe — public, no auth
  const emailHealth = await request("GET", "/api/health/email");
  let healthOk = false;
  try {
    const body = JSON.parse(emailHealth.data);
    healthOk = body?.config?.gmailUserPresent && body?.config?.gmailAppPasswordPresent && body?.smtpVerify?.ok;
    console.log(`    email health: ${JSON.stringify(body)}`);
  } catch {}
  check(
    "GET /api/health/email — Gmail SMTP healthy",
    emailHealth.statusCode === 200 && healthOk,
    `status ${emailHealth.statusCode}`,
  );

  // 2. Protected pages should redirect when unauthenticated
  const dashAnon = await request("GET", "/dashboard");
  check(
    "GET /dashboard (anonymous) → redirects to login",
    dashAnon.statusCode === 307 || dashAnon.statusCode === 302,
    `status ${dashAnon.statusCode}, location=${dashAnon.headers.location ?? "—"}`,
  );

  const adminAnon = await request("GET", "/admin");
  check(
    "GET /admin (anonymous) → redirects to admin login",
    adminAnon.statusCode === 307 || adminAnon.statusCode === 302,
    `status ${adminAnon.statusCode}, location=${adminAnon.headers.location ?? "—"}`,
  );

  // 3. /api/slots returns slot list
  const slots = await request("GET", "/api/slots?date=2026-06-01");
  let slotsOk = false;
  try {
    const body = JSON.parse(slots.data);
    slotsOk = Array.isArray(body.slots);
  } catch {
    slotsOk = false;
  }
  check("GET /api/slots returns slots array", slots.statusCode === 200 && slotsOk, `status ${slots.statusCode}`);

  // 4. Auth signup + new endpoints
  const testEmail = `smoke_${Date.now()}@example.com`;
  const signup = await request("POST", "/api/auth/signup", {
    name: "Smoke Tester",
    email: testEmail,
    password: "smoketest123",
    phone: "9999999999",
  });
  check("POST /api/auth/signup", signup.statusCode === 200, `status ${signup.statusCode}`);
  const sessionCookie = parseCookie(signup.headers["set-cookie"], "breathe_player_session");

  // Forgot-password: always returns ok for non-existent emails (generic response)
  const forgot = await request("POST", "/api/auth/forgot-password", { email: "nobody@nowhere.test" });
  check(
    "POST /api/auth/forgot-password (unknown email) returns generic ok",
    forgot.statusCode === 200,
    `status ${forgot.statusCode}`,
  );

  // Reset-password: invalid token should 400, not 500
  const reset = await request("POST", "/api/auth/reset-password", { token: "x".repeat(40), password: "new-strong-pass-123" });
  check(
    "POST /api/auth/reset-password (bad token) returns 400",
    reset.statusCode === 400,
    `status ${reset.statusCode}`,
  );

  if (sessionCookie) {
    // Player profile GET/PATCH
    const profileGet = await request("GET", "/api/player/profile", null, {
      Cookie: `breathe_player_session=${sessionCookie}`,
    });
    check("GET /api/player/profile (auth)", profileGet.statusCode === 200, `status ${profileGet.statusCode}`);

    const profilePatch = await request(
      "PATCH",
      "/api/player/profile",
      { name: "Smoke Tester Updated", phone: "9876543210" },
      { Cookie: `breathe_player_session=${sessionCookie}` },
    );
    check("PATCH /api/player/profile", profilePatch.statusCode === 200, `status ${profilePatch.statusCode}`);

    // Cancel: missing booking_id → 400 (proves route exists)
    const cancel = await request(
      "POST",
      "/api/player/bookings/cancel",
      {},
      { Cookie: `breathe_player_session=${sessionCookie}` },
    );
    check(
      "POST /api/player/bookings/cancel (no body) returns 400",
      cancel.statusCode === 400,
      `status ${cancel.statusCode}`,
    );
  }

  // 5. Admin endpoints — should 401 without admin session
  const adminEndpoints = [
    "/api/admin/notices",
    "/api/admin/config",
    "/api/admin/customers/00000000-0000-0000-0000-000000000000",
    "/api/admin/gallery",
    "/api/admin/test-email",
  ];
  for (const path of adminEndpoints) {
    const r = await request("GET", path);
    check(`GET ${path} without admin → 401`, r.statusCode === 401, `status ${r.statusCode}`);
  }

  // 5b. New admin write endpoints should also 401 without admin
  const adminWriteChecks = [
    ["POST", "/api/admin/bookings/walk-in"],
    ["POST", "/api/admin/slots/bulk-block"],
  ];
  for (const [method, path] of adminWriteChecks) {
    const r = await request(method, path, {});
    check(`${method} ${path} without admin → 401`, r.statusCode === 401, `status ${r.statusCode}`);
  }

  // 6. Rate-limit smoke: hammer signup endpoint, expect 429 eventually
  let saw429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await request("POST", "/api/auth/signup", { name: "x", email: `flood_${i}@example.com`, password: "short" });
    if (r.statusCode === 429) {
      saw429 = true;
      break;
    }
  }
  check("POST /api/auth/signup rate limited after 5 attempts", saw429, saw429 ? "429 received" : "never saw 429");

  console.log("\n=== Summary ===");
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    for (const r of failed) console.log(`  - ${r.name}${r.detail ? ` (${r.detail})` : ""}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
