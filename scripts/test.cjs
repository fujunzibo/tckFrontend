/* Runs the preview adapter against an isolated temporary store, never user data. */
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
};
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tck-wins-test-"));
const file = path.join(directory, "store.json");
process.env.DEMO_DATA_FILE = file;
process.env.DEMO_ADMIN_PASSWORD = randomUUID();
const { handleDemoRequest: api } = require("../app/lib/demo-server.ts");
const { formatAtomic, safeReturnPath } = require("../app/lib/amount.ts");
let count = 0;
async function test(name, fn) {
  await fn();
  count++;
  console.log(`PASS ${name}`);
}
const call = (route, token, method = "GET", body, key = randomUUID()) =>
  api({ url: `http://localhost/api/v1${route}`, token, method, body, key });
const rejects = (promise, code) =>
  assert.rejects(promise, (error) => error.code === code);
const advance = async (milliseconds, fn) => {
  const original = Date.now;
  Date.now = () => original() + milliseconds;
  try {
    return await fn();
  } finally {
    Date.now = original;
  }
};

async function main() {
  await test("exact amounts and safe redirects", async () => {
    assert.equal(
      formatAtomic("123456789012345678901234567890", 18),
      "123,456,789,012.34567890123456789",
    );
    assert.equal(formatAtomic("-000100", 2), "-1");
    assert.equal(formatAtomic("1e6"), "—");
    assert.equal(safeReturnPath("//malicious.example"), "/dashboard");
    assert.equal(safeReturnPath("/\\malicious.example"), "/dashboard");
    assert.equal(
      safeReturnPath("/games/coin-flip?session=123"),
      "/games/coin-flip?session=123",
    );
  });
  const alice = await call("/auth/demo-login", undefined, "POST", {
    nickname: "Alice",
  });
  const bob = await call("/auth/demo-login", undefined, "POST", {
    nickname: "Bob",
    ref: alice.user.invitationCode,
  });
  const admin = await call("/admin/auth/login", undefined, "POST", {
    username: "admin",
    password: process.env.DEMO_ADMIN_PASSWORD,
  });
  const token = alice.accessToken;
  await test("identity and administrator domain isolation", async () => {
    await rejects(call("/admin/users", token), "UNAUTHORIZED");
    await rejects(call("/auth/me", admin.accessToken), "UNAUTHORIZED");
    await rejects(call("/auth/me", "forged-token"), "UNAUTHORIZED");
    const again = await call("/auth/demo-login", undefined, "POST", {
      resumeSecret: alice.resumeSecret,
    });
    assert.equal(again.user.id, alice.user.id);
    assert.equal((await call("/invitations/me", token)).totalInvited, 1);
    assert.equal(
      (await call("/assets/me", token)).items.find((a) => a.assetId === "SSC")
        .availableAtomic,
      "1000",
    );
  });
  let round;
  await test("concurrent round creation reuses one quote and one debit", async () => {
    const { quote } = await call(
      "/games/game_coin_flip/quotes",
      token,
      "POST",
      { choice: "heads" },
    );
    const key = randomUUID();
    const [a, b] = await Promise.all([
      call(
        "/games/game_coin_flip/sessions",
        token,
        "POST",
        { quoteId: quote.id },
        key,
      ),
      call(
        "/games/game_coin_flip/sessions",
        token,
        "POST",
        { quoteId: quote.id },
        key,
      ),
    ]);
    round = a.session;
    assert.equal(a.session.id, b.session.id);
    const again = await call("/games/game_coin_flip/sessions", token, "POST", {
      quoteId: quote.id,
    });
    assert.equal(again.session.id, round.id);
    assert.equal(
      (await call("/assets/me", token)).items.find((a) => a.assetId === "SSC")
        .availableAtomic,
      "975",
    );
    await rejects(
      call(
        "/games/game_coin_flip/sessions",
        token,
        "POST",
        { quoteId: "different" },
        key,
      ),
      "IDEMPOTENCY_CONFLICT",
    );
    await rejects(
      call(`/game-sessions/${round.id}`, bob.accessToken),
      "NOT_FOUND",
    );
    await rejects(call("/games?page=0"), "VALIDATION_ERROR");
  });
  await test("saved state survives simulated process restart and settles once", async () => {
    global.winsDemoQueue = undefined;
    const finished = await advance(5000, () =>
      call(`/game-sessions/${round.id}`, token),
    );
    assert.equal(finished.session.status, "settled");
    assert.equal(finished.session.outcome, round.outcome);
    const assets = (await call("/assets/me", token)).items;
    assert.equal(assets.find((a) => a.assetId === "SSC").lockedAtomic, "0");
    assert.equal(
      assets.find((a) => a.assetId === "SSC").availableAtomic,
      String(975 + Number(round.payoutAtomic)),
    );
    const before = fs.readFileSync(file, "utf8");
    await call(`/game-sessions/${round.id}`, token);
    assert.equal(
      JSON.parse(fs.readFileSync(file, "utf8")).ledger.length,
      JSON.parse(before).ledger.length,
    );
  });
  let record;
  await test("review verifies version, reason and private submission ownership", async () => {
    await rejects(
      call("/quests/first-game/submit", bob.accessToken, "POST", {
        proof: round.id,
      }),
      "VALIDATION_ERROR",
    );
    ({ record } = await call("/quests/first-game/submit", token, "POST", {
      proof: round.id,
    }));
    await rejects(
      call(
        `/admin/quest-records/${record.id}/review`,
        admin.accessToken,
        "POST",
        { action: "reject", version: record.version, reason: "" },
      ),
      "VALIDATION_ERROR",
    );
    await rejects(
      call(
        `/admin/quest-records/${record.id}/review`,
        admin.accessToken,
        "POST",
        { action: "approve", version: 999 },
      ),
      "VERSION_CONFLICT",
    );
    const approved = await call(
      `/admin/quest-records/${record.id}/review`,
      admin.accessToken,
      "POST",
      { action: "approve", version: record.version },
    );
    record = approved.record;
  });
  await test("quest and rewards claims issue exactly once under concurrency", async () => {
    await Promise.all([
      call("/quests/first-game/claim", token, "POST", {}),
      call(`/rewards/${record.rewardGrantId}/claim`, token, "POST", {}),
    ]);
    assert.equal((await call("/auth/me", token)).user.pointsExact, "100");
    assert.equal((await call("/users/me/point-logs", token)).items.length, 1);
    assert.equal(
      (await call("/notifications?type=reward", token)).items.length,
      1,
    );
    assert.equal((await call("/invitations/me", token)).effectiveInvited, 0);
  });
  await test("failed generation returns one ticket; retry can recover", async () => {
    const { fighter } = await call("/fighters", token, "POST", {
      name: "NOVA",
      style: "striker",
      simulateFailure: true,
    });
    assert.equal(
      (await call("/tickets/me", token)).balance.availableAtomic,
      "2",
    );
    const failed = await advance(6000, () =>
      call(`/fighters/${fighter.id}`, token),
    );
    assert.equal(failed.fighter.status, "failed");
    assert.equal(
      (await call("/tickets/me", token)).balance.availableAtomic,
      "3",
    );
    await call(`/fighters/${fighter.id}`, token);
    assert.equal(
      (await call("/tickets/me", token)).balance.availableAtomic,
      "3",
    );
    await call(`/fighters/${fighter.id}/retry`, token, "POST", {});
    const ready = await advance(6000, () =>
      call(`/fighters/${fighter.id}`, token),
    );
    assert.equal(ready.fighter.status, "ready");
    const { fight } = await call("/fights/queue", token, "POST", {
      fighterId: fighter.id,
    });
    await rejects(
      call("/fights/queue", token, "POST", { fighterId: fighter.id }),
      "FIGHTER_BUSY",
    );
    assert.equal(
      (await advance(8000, () => call(`/fights/${fight.id}`, token))).fight
        .status,
      "settled",
    );
  });
  await test("notification snapshot does not mark later messages or other users", async () => {
    const snapshot = await call("/notifications", token);
    await call("/quests/daily-check-in/submit", token, "POST", {});
    await call("/notifications/read-all", token, "POST", {
      ids: snapshot.snapshotIds,
    });
    assert.equal((await call("/notifications/unread-count", token)).count, 1);
    const other = await call("/notifications", bob.accessToken);
    await rejects(
      call(`/notifications/${other.items[0].id}/read`, token, "PATCH", {}),
      "NOT_FOUND",
    );
  });
  await test("negative balance and stale settings are rejected without mutations", async () => {
    await rejects(
      call("/admin/points/adjust", admin.accessToken, "POST", {
        userId: alice.user.id,
        changeAmount: "-1000",
        reason: "test deduction",
      }),
      "INSUFFICIENT_BALANCE",
    );
    assert.equal((await call("/auth/me", token)).user.pointsExact, "100");
    await rejects(
      call("/admin/settings", admin.accessToken, "PATCH", {
        version: 999,
        gameCostAtomic: "40",
        maxFighters: 3,
        maintenance: false,
      }),
      "VERSION_CONFLICT",
    );
    assert.ok(
      (await call("/admin/audit-logs", admin.accessToken)).pagination.total > 0,
    );
  });
  await test("logout revokes tokens while recovery requires identity proof", async () => {
    await call("/auth/logout", token, "POST", {});
    await rejects(call("/auth/me", token), "UNAUTHORIZED");
    await rejects(
      call("/auth/demo-login", undefined, "POST", {
        resumeSecret: "unknown-secret",
      }),
      "UNAUTHORIZED",
    );
    assert.equal(
      (
        await call("/auth/demo-login", undefined, "POST", {
          resumeSecret: alice.resumeSecret,
        })
      ).user.pointsExact,
      "100",
    );
  });
  console.log(`\n${count} scenario groups passed.`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    // Only remove the two files this test can create; never recursively delete paths.
    for (const candidate of [file, `${file}.${process.pid}.tmp`])
      if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
    fs.rmdirSync(directory);
  });
