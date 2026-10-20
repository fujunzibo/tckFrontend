// Uses an isolated Chrome tab with test EIP-1193 providers. No real keys or funds.
// Start the app/API and a test Chrome with --remote-debugging-port=9333 first.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.CHECK_BASE_URL || "http://127.0.0.1:3001";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function installProviders() {
  const addressA = "0x1111111111111111111111111111111111111111";
  const addressB = "0x2222222222222222222222222222222222222222";
  const calls = [];
  const apiCalls = [];
  function make(id, address) {
    const listeners = {};
    const provider = {
      accounts: [address],
      chain: "0x1",
      reject: 0,
      on(event, listener) {
        (listeners[event] ??= new Set()).add(listener);
      },
      removeListener(event, listener) {
        listeners[event]?.delete(listener);
      },
      emit(event, data) {
        for (const listener of listeners[event] ?? []) listener(data);
      },
      async request(args) {
        calls.push({ id, ...args });
        if (
          provider.reject &&
          ["eth_requestAccounts", "personal_sign"].includes(args.method)
        )
          throw Object.assign(new Error("User rejected"), {
            code: provider.reject,
          });
        if (["eth_accounts", "eth_requestAccounts"].includes(args.method))
          return provider.accounts;
        if (args.method === "eth_chainId") return provider.chain;
        if (args.method === "personal_sign") {
          if (window.walletTest.changeDuringSign) {
            provider.accounts = [addressB];
            provider.emit("accountsChanged", provider.accounts);
          }
          return "0x" + "11".repeat(65);
        }
        throw new Error("Unexpected wallet method: " + args.method);
      },
    };
    return provider;
  }
  const first = make("first", addressA),
    second = make("second", addressB);
  const test = (window.walletTest = {
    first,
    second,
    calls,
    apiCalls,
    enabled: false,
    changeDuringSign: false,
    changeDuringLogin: false,
    user: null,
  });
  if (new URL(location.href).searchParams.has("legacy"))
    window.ethereum = first;
  else
    window.addEventListener("eip6963:requestProvider", () => {
      for (const [id, provider] of [
        ["first", first],
        ["second", second],
      ])
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: { uuid: id, rdns: "test." + id, name: "Test Wallet " + id },
              provider,
            },
          }),
        );
    });
  const originalFetch = window.fetch.bind(window);
  const response = (data) =>
    new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  window.fetch = async (url, options = {}) => {
    const path = new URL(String(url), location.origin).pathname;
    if (path.includes("/auth/"))
      apiCalls.push({
        path,
        body: options.body ? JSON.parse(options.body) : null,
      });
    if (test.enabled && path.endsWith("/auth/nonce"))
      return response({
        nonce: "test-nonce",
        message: "Sign in to tck666.cc\n钱包身份验证",
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      });
    if (test.enabled && path.endsWith("/auth/login")) {
      const body = JSON.parse(options.body);
      test.user = {
        id: "wallet-test-user",
        walletAddress: body.walletAddress,
        nickname: "Wallet Test",
        status: "normal",
      };
      if (test.changeDuringLogin) {
        first.accounts = [addressB];
        first.emit("accountsChanged", first.accounts);
      }
      return response({ user: test.user, accessToken: "wallet-test-token" });
    }
    if (
      path.endsWith("/auth/me") &&
      new Headers(options.headers).get("Authorization") ===
        "Bearer wallet-test-token"
    )
      return response({ user: test.user });
    if (
      path.endsWith("/auth/logout") &&
      new Headers(options.headers).get("Authorization") ===
        "Bearer wallet-test-token"
    )
      return response({});
    return originalFetch(url, options);
  };
}

async function main() {
  const target = await (
    await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map(),
    errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? handler.reject(Error(message.error.message))
        : handler.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      ws.send(JSON.stringify({ id: next, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result?.value;
  };
  const until = async (expression, label = expression) => {
    for (let i = 0; i < 160; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(100);
    }
    throw Error("Timeout: " + label);
  };
  const click = (selector) =>
    evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const navigate = async (route) => {
    await send("Page.navigate", { url: base + route });
    await until(
      'document.readyState === "complete" && document.querySelector("[data-wallet-form]")',
    );
  };
  const token = 'localStorage.getItem("wins:/api/v1:user-token")';
  const connected = 'document.querySelector("[data-wallet-address]")';
  const disconnected = '!document.querySelector("[data-wallet-address]")';
  const alert =
    'document.querySelector("[data-wallet-form] [role=alert]")?.textContent';
  const connect = async () => {
    await click('[data-wallet-provider="test.first"]');
    await until(connected);
  };
  const disconnect = async () => {
    await click("[data-wallet-disconnect]");
    await until(disconnected);
  };
  try {
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigate("/connect");
    await evaluate("localStorage.clear(); sessionStorage.clear()");
    await navigate("/connect");
    await until('document.querySelector("[data-wallet-missing]")');
    assert.match(
      await evaluate('document.querySelector(".nav-login").textContent'),
      /连接钱包/,
    );
    console.log("PASS no wallet installed; wallet login is the default entry");
    const injected = await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(${installProviders.toString()})()`,
    });
    await navigate("/connect?returnTo=%2Fconnect%3Fdone%3D1&ref=TCK-TEST");
    await until(
      'document.querySelectorAll("[data-wallet-provider]").length === 2',
    );
    assert.equal(
      await evaluate(
        'walletTest.calls.filter(c => c.method === "eth_requestAccounts").length',
      ),
      0,
    );
    await evaluate("walletTest.first.reject = 4001");
    await click('[data-wallet-provider="test.first"]');
    await until(`${alert}?.includes("取消")`);
    assert.equal(await evaluate(token), null);
    await evaluate("walletTest.first.reject = 0");
    await connect();
    assert.equal(await evaluate(token), null);
    await click("[data-wallet-sign-in]");
    await until(`${alert}?.includes("尚未开放")`);
    assert.equal(
      await evaluate(
        'walletTest.calls.filter(c => c.method === "personal_sign").length',
      ),
      0,
    );
    console.log(
      "PASS real API FEATURE_DISABLED keeps wallet connected without creating a login",
    );
    await evaluate("walletTest.enabled = true; walletTest.first.reject = 4001");
    await click("[data-wallet-sign-in]");
    await until(`${alert}?.includes("取消")`);
    assert.equal(
      await evaluate(
        'walletTest.apiCalls.filter(c => c.path.endsWith("/auth/login")).length',
      ),
      0,
    );
    await evaluate("walletTest.first.reject = 0");
    await click("[data-wallet-sign-in]");
    await until(`${token} === "wallet-test-token"`);
    await until('location.search === "?done=1"');
    const signed = await evaluate(
      'walletTest.calls.find(c => c.method === "personal_sign").params',
    );
    assert.equal(
      Buffer.from(signed[0].slice(2), "hex").toString("utf8"),
      "Sign in to tck666.cc\n钱包身份验证",
    );
    assert.equal(signed[1], "0x1111111111111111111111111111111111111111");
    const login = await evaluate(
      'walletTest.apiCalls.find(c => c.path.endsWith("/auth/login")).body',
    );
    assert.equal(login.ref, "TCK-TEST");
    assert.equal(login.nonce, "test-nonce");
    console.log(
      "PASS signature cancellation, UTF-8 personal_sign, login contract and returnTo/ref",
    );
    await evaluate(
      'walletTest.first.chain = "0x2105"; walletTest.first.emit("chainChanged", "0x2105")',
    );
    await until(
      `${token} === null && document.querySelector("[data-wallet-chain]").textContent === "8453"`,
    );
    await click("[data-wallet-sign-in]");
    await until(`${token} === "wallet-test-token"`);
    await evaluate(
      'walletTest.first.accounts = ["0x2222222222222222222222222222222222222222"]; walletTest.first.emit("accountsChanged", walletTest.first.accounts)',
    );
    await until(
      `${token} === null && document.querySelector("[data-wallet-address]").textContent.includes("22222222")`,
    );
    await evaluate('walletTest.first.emit("accountsChanged", [])');
    await until(disconnected);
    console.log(
      "PASS chain/account changes clear website login; empty accounts disconnect",
    );
    await evaluate(
      'walletTest.first.accounts = ["0x1111111111111111111111111111111111111111"]; walletTest.first.chain = "0x1"',
    );
    await connect();
    await evaluate("walletTest.changeDuringSign = true");
    const before = await evaluate(
      'walletTest.apiCalls.filter(c => c.path.endsWith("/auth/login")).length',
    );
    await click("[data-wallet-sign-in]");
    await until(`${alert}?.includes("已变化")`);
    assert.equal(
      await evaluate(
        'walletTest.apiCalls.filter(c => c.path.endsWith("/auth/login")).length',
      ),
      before,
    );
    await evaluate(
      'walletTest.changeDuringSign = false; walletTest.first.accounts = ["0x1111111111111111111111111111111111111111"]; walletTest.first.emit("accountsChanged", walletTest.first.accounts); walletTest.changeDuringLogin = true',
    );
    await click("[data-wallet-sign-in]");
    await until(
      `${alert}?.includes("已变化") && !document.querySelector("[data-wallet-sign-in]").disabled`,
    );
    assert.equal(await evaluate(token), null);
    console.log(
      "PASS account changes during signing/API login cannot establish a stale session",
    );
    await disconnect();
    await click('[data-wallet-provider="test.second"]');
    await until(connected);
    assert.equal(await evaluate("walletTest.calls.at(-1).id"), "second");
    await navigate("/connect");
    await until(connected);
    assert.equal(
      await evaluate(
        'walletTest.calls.filter(c => c.method === "eth_requestAccounts").length',
      ),
      0,
    );
    await disconnect();
    await navigate("/connect");
    await until(
      'document.querySelectorAll("[data-wallet-provider]").length === 2',
    );
    assert.equal(await evaluate(connected), null);
    console.log(
      "PASS selected wallet restore is silent; explicit disconnect persists after reload",
    );
    await navigate("/connect?legacy=1");
    await until('document.querySelector("[data-wallet-provider=injected]")');
    await click('[data-wallet-provider="injected"]');
    await until(connected);
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    assert.equal(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
      true,
    );
    fs.mkdirSync("test-results", { recursive: true });
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "test-results/wallet-mobile.png",
      Buffer.from(screenshot.data, "base64"),
    );
    await evaluate('walletTest.first.emit("disconnect", { code: 4900 })');
    await until(disconnected);
    assert.equal(
      await evaluate(
        'walletTest.apiCalls.some(c => c.path.endsWith("demo-login"))',
      ),
      false,
    );
    assert.equal(
      await evaluate(
        "walletTest.calls.some(c => /sendTransaction|signTransaction/.test(c.method))",
      ),
      false,
    );
    await send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: injected.identifier,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS legacy provider, mobile layout, provider disconnect; no transactions or demo fallback",
    );
  } finally {
    await evaluate("localStorage.clear(); sessionStorage.clear()").catch(
      () => {},
    );
    ws.close();
    await fetch("http://127.0.0.1:9333/json/close/" + target.id);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
