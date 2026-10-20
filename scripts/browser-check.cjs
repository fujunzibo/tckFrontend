// Optional local Chrome check. Start Chrome with remote debugging on 127.0.0.1:9333.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.env.CHECK_BASE_URL || "http://127.0.0.1:3001";
const apiBase = process.env.CHECK_API_BASE_URL || `${base}/api/v1`;
const tokenPrefix = `wins:${process.env.CHECK_TOKEN_API_BASE_URL || process.env.CHECK_API_BASE_URL || "/api/v1"}:`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];

async function main() {
  const target = await (
    await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let counter = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (handler)
        message.error
          ? handler.reject(new Error(message.error.message))
          : handler.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
    if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "error"
    )
      errors.push(
        message.params.args.map((a) => a.value || a.description).join(" "),
      );
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++counter;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result?.value;
  };
  const until = async (expression, label) => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await wait(100);
    }
    throw new Error(`Timeout: ${label}`);
  };
  const navigate = async (route) => {
    await send("Page.navigate", { url: base + route });
    await until(
      'document.readyState === "complete" && document.querySelector("main")',
      route,
    );
    await wait(450);
  };
  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(
      path.join("test-results", name),
      Buffer.from(result.data, "base64"),
    );
  };
  const fill = (selector, value) =>
    evaluate(
      `(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw Error('Missing field'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
    );
  try {
    fs.mkdirSync("test-results", { recursive: true });
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate("/");
    await until(
      'document.querySelectorAll(".game-card").length === 4',
      "home catalog",
    );
    await screenshot("home-desktop.png");
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      true,
      "desktop overflow",
    );
    await navigate("/connect");
    await evaluate('document.querySelector(".demo-login").open = true');
    await fill("form input[type=text]", "Browser Explorer");
    await evaluate(
      'document.querySelector("form input[type=checkbox]").click()',
    );
    await evaluate('document.querySelector("form button").click()');
    await until(
      'location.pathname === "/dashboard" && document.querySelectorAll(".asset-card").length === 4',
      "demo login",
    );
    await navigate("/games/coin-flip");
    await until(
      'document.querySelector(".choice-grid") !== null',
      "coin controls",
    );
    await evaluate(
      'document.querySelector(".game-detail-grid .full-width").click()',
    );
    await until(
      'document.querySelector(".game-detail-grid .full-width")?.textContent.includes("确认参与")',
      "quote",
    );
    await evaluate(
      'document.querySelector(".game-detail-grid .full-width").click()',
    );
    await until(
      'document.querySelector(".result-amount") !== null',
      "settlement",
    );
    const roundId = await evaluate(
      'document.querySelector(".round-result input").value',
    );
    await screenshot("game-desktop.png");
    await navigate("/quests/first-game");
    await until('document.querySelector("textarea") !== null', "quest form");
    await evaluate(
      `(() => { const el=document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(roundId)}); el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
    );
    await evaluate('document.querySelector("form button").click()');
    await until(
      'document.querySelector(".status-pending_review") !== null',
      "quest submitted",
    );
    await navigate("/admin/login");
    await until('document.querySelector("input[autocomplete=username]")', "administrator form");
    await fill('input[autocomplete=username]', process.env.ADMIN_USERNAME || "admin");
    await fill('input[autocomplete=current-password]', process.env.DEMO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "change-this-local-demo-password");
    await evaluate('document.querySelector("form .btn-primary").click()');
    await until('location.pathname === "/admin"', "administrator login");
    const admin = { data: { accessToken: await evaluate(`localStorage.getItem(${JSON.stringify(`${tokenPrefix}admin-token`)})`) } };
    await navigate("/admin/quest-reviews");
    await until(
      'document.querySelector(".review-card .btn-primary") !== null',
      "admin review",
    );
    await evaluate(
      'document.querySelector(".review-card .btn-primary").click()',
    );
    await until(
      'document.querySelector(".status-completed") !== null',
      "review approved",
    );
    await navigate("/rewards");
    await until(
      'document.querySelector(".reward-card button:not(:disabled)") !== null',
      "reward",
    );
    await evaluate('document.querySelector(".reward-card button").click()');
    await until(
      'document.querySelector(".status-issued") !== null',
      "reward issued",
    );
    await navigate("/fighters");
    await until(
      'document.querySelector(".fighter-toolbar button") !== null',
      "fighters",
    );
    await evaluate('document.querySelector(".fighter-toolbar button").click()');
    await fill(".fighter-create input:not([type=checkbox])", "Aurora");
    await evaluate(
      'document.querySelector(".fighter-create button[type=submit], .fighter-create .btn-primary").click()',
    );
    await until(
      'location.pathname.startsWith("/fighters/") && document.querySelector(".status-ready") !== null',
      "fighter ready",
    );
    await screenshot("fighter-desktop.png");
    await evaluate(
      'document.querySelector(".fighter-detail .btn-primary").click()',
    );
    await until(
      'location.pathname.startsWith("/fights/") && document.querySelector(".status-settled") !== null',
      "fight settled",
    );
    await screenshot("fight-desktop.png");
    for (const route of [
      "/tickets",
      "/notifications",
      "/invite",
      "/leaderboard",
      "/membership",
      "/profile",
      "/admin/users",
      "/admin/quests",
      "/admin/points",
      "/admin/settings",
      "/admin/audit-logs",
    ]) {
      await navigate(route);
      assert.equal(
        await evaluate(
          'document.querySelectorAll(".inline-error,[role=alert]").length',
        ),
        0,
        route,
      );
    }
    if (process.env.CHECK_API_BASE_URL) {
      await navigate("/admin/quests");
      await until(
        'Array.from(document.querySelectorAll("button")).some(b => b.textContent.includes("任务预算"))',
        "budget entry",
      );
      await evaluate(
        'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("任务预算")).click()',
      );
      await until(
        'document.querySelector("[data-budget-quest] button[type=submit], [data-budget-quest] .btn-primary:not(:disabled)")',
        "budget form",
      );
      const questId = await evaluate(
        'document.querySelector("[data-budget-quest]").dataset.budgetQuest',
      );
      const before = await (
        await fetch(`${apiBase}/admin/quests/${questId}/budget`, {
          headers: { Authorization: `Bearer ${admin.data.accessToken}` },
        })
      ).json();
      await fill("[data-budget-quest] input[inputmode=numeric]", "25");
      await fill(
        '[data-budget-quest] input[minlength="3"]',
        "Browser budget verification",
      );
      await evaluate(
        'document.querySelector("[data-budget-quest] .btn-primary").click()',
      );
      await until(
        '!document.querySelector("[data-budget-quest]")',
        "budget allocated",
      );
      const after = await (
        await fetch(`${apiBase}/admin/quests/${questId}/budget`, {
          headers: { Authorization: `Bearer ${admin.data.accessToken}` },
        })
      ).json();
      assert.equal(
        BigInt(after.data.availableAtomic),
        BigInt(before.data.availableAtomic) + 25n,
      );
    }
    await navigate("/");
    await evaluate(
      "localStorage.setItem('wins-locale','en');window.dispatchEvent(new Event('wins:locale'))",
    );
    await until('document.documentElement.lang === "en"', "language");
    await navigate("/games");
    assert.equal(await evaluate("document.documentElement.lang"), "en");
    await evaluate(
      "localStorage.setItem('wins-locale','zh');window.dispatchEvent(new Event('wins:locale'))",
    );
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate("/");
    await screenshot("home-mobile.png");
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      true,
      "mobile home overflow",
    );
    await navigate("/games");
    await screenshot("games-mobile.png");
    assert.equal(
      await evaluate(
        "document.documentElement.scrollWidth <= window.innerWidth",
      ),
      true,
      "mobile games overflow",
    );
    await evaluate(`(() => {
      const select = document.querySelector('.filter-selects select');
      select.value = 'coin_flip';
      select.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await until(
      'location.search.includes("gameKind=coin_flip") && document.querySelectorAll(".game-card").length === 1',
      "game kind filter",
    );
    assert.deepEqual(errors, [], "browser errors");
    console.log(
      "PASS browser: desktop/mobile, login, quote, settlement, quest review, reward, fighter, fight, routes, locale restoration; no console errors",
    );
  } finally {
    ws.close();
    await fetch(`http://127.0.0.1:9333/json/close/${target.id}`).catch(
      () => {},
    );
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
