const http = require("http");

const BASE_URL = "http://localhost:3000";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const c of cookies) {
    const parts = c.split(";");
    for (const p of parts) {
      const trimP = p.trim();
      if (trimP.startsWith(name + "=")) {
        return trimP.substring(name.length + 1);
      }
    }
  }
  return null;
}

async function runTests() {
  console.log("=== STARTING BACK-TEST AUDIT ===");
  const testEmail = `test_player_${Date.now()}@example.com`;
  const testPassword = "password123";
  const testName = "Test Player";

  // 1. Test Signup
  console.log("\n1. Testing Signup...");
  const signupResp = await request("POST", "/api/auth/signup", {
    name: testName,
    email: testEmail,
    password: testPassword,
    phone: "9876543210",
  });
  console.log(`Signup Status: ${signupResp.statusCode}`);
  console.log(`Signup Response: ${signupResp.data}`);
  const userCookie = parseCookie(signupResp.headers["set-cookie"], "breathe_player_session");
  console.log(`breathe_player_session cookie set? ${!!userCookie}`);

  if (signupResp.statusCode !== 200) {
    console.error("❌ Signup failed!");
    process.exit(1);
  }

  // 2. Test Login
  console.log("\n2. Testing Login...");
  const loginResp = await request("POST", "/api/auth/login", {
    email: testEmail,
    password: testPassword,
  });
  console.log(`Login Status: ${loginResp.statusCode}`);
  console.log(`Login Response: ${loginResp.data}`);
  const loginCookie = parseCookie(loginResp.headers["set-cookie"], "breathe_player_session");
  console.log(`breathe_player_session cookie set after login? ${!!loginCookie}`);

  if (loginResp.statusCode !== 200 || !loginCookie) {
    console.error("❌ Login failed!");
    process.exit(1);
  }

  // 3. Test Session Validation (/api/auth/me)
  console.log("\n3. Testing /api/auth/me endpoint...");
  const meResp = await request("GET", "/api/auth/me", null, {
    Cookie: `breathe_player_session=${loginCookie}`,
  });
  console.log(`me Status: ${meResp.statusCode}`);
  console.log(`me Response: ${meResp.data}`);

  if (meResp.statusCode !== 200) {
    console.error("❌ /api/auth/me failed!");
    process.exit(1);
  }

  // 4. Test User Dashboard page fetch (/dashboard)
  console.log("\n4. Testing /dashboard fetch (simulating browser loading the portal)...");
  const dashboardResp = await request("GET", "/dashboard", null, {
    Cookie: `breathe_player_session=${loginCookie}`,
  });
  console.log(`Dashboard Page Status: ${dashboardResp.statusCode}`);
  console.log(`Dashboard Page Redirect: ${dashboardResp.headers["location"] ?? "None"}`);
  console.log(`Contains player's name? ${dashboardResp.data.includes("Test")}`);

  if (dashboardResp.statusCode !== 200) {
    console.error(`❌ /dashboard fetch failed! Status: ${dashboardResp.statusCode}`);
    if (dashboardResp.headers["location"]) {
      console.error(`Redirected to: ${dashboardResp.headers["location"]}`);
    }
    process.exit(1);
  } else {
    console.log("✅ User Dashboard portal loaded successfully! No redirects or blank screen.");
  }

  // 5. Test Admin Login
  console.log("\n5. Testing Admin Login...");
  const adminLoginResp = await request("POST", "/api/admin/auth/login", {
    email: "breathepickleball@gmail.com",
    password: "breathe-admin",
  });
  console.log(`Admin Login Status: ${adminLoginResp.statusCode}`);
  console.log(`Admin Login Response: ${adminLoginResp.data}`);
  const adminCookie = parseCookie(adminLoginResp.headers["set-cookie"], "breathe_admin_session");
  console.log(`breathe_admin_session cookie set? ${!!adminCookie}`);

  if (adminLoginResp.statusCode !== 200 || !adminCookie) {
    console.error("❌ Admin Login failed!");
    process.exit(1);
  }

  // 6. Test Admin Console fetch (/admin)
  console.log("\n6. Testing /admin fetch...");
  const adminResp = await request("GET", "/admin", null, {
    Cookie: `breathe_admin_session=${adminCookie}`,
  });
  console.log(`Admin Console Status: ${adminResp.statusCode}`);
  console.log(`Admin Console Redirect: ${adminResp.headers["location"] ?? "None"}`);
  console.log(`Contains Owner console? ${adminResp.data.includes("Owner console")}`);

  if (adminResp.statusCode !== 200) {
    console.error(`❌ /admin fetch failed! Status: ${adminResp.statusCode}`);
    if (adminResp.headers["location"]) {
      console.error(`Redirected to: ${adminResp.headers["location"]}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Admin Console portal loaded successfully! No redirects or blank screen.");
  }

  console.log("\n🎉 ALL BACK-TEST TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});
