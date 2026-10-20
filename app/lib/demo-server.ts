// Local preview adapter only. Replace with NestJS in integrated environments.
import {
  createHash,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  publicPresentation,
  fightReward,
  FIGHT_WIN_AMOUNT,
} from "../../../backend/src/public-presentation";
import { games as catalog, initialQuests } from "./catalog";
import {
  copy,
  type Asset,
  type Audit,
  type Fight,
  type Fighter,
  type Game,
  type GameSession,
  type Ledger,
  type Notice,
  type Quest,
  type Quote,
  type Reward,
  type Settings,
  type Submission,
  type User,
} from "./contracts";

export class DemoError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
type Session = { userId: string; domain: "user" | "admin"; expiresAt: number };
interface Store {
  schema: 1;
  users: User[];
  identities: Record<string, string>;
  tokens: Record<string, Session>;
  assets: Record<string, Asset[]>;
  games: Game[];
  quotes: Quote[];
  sessions: GameSession[];
  fighters: Fighter[];
  fights: Fight[];
  quests: Quest[];
  records: Submission[];
  rewards: Reward[];
  notices: Notice[];
  ledger: Ledger[];
  audit: Audit[];
  settings: Settings;
  keys: Record<string, { hash: string; data: unknown }>;
}
const timestamp = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${randomUUID()}`;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const fail = (status: number, code: string, message: string): never => {
  throw new DemoError(status, code, message);
};
const required = <T>(value: T | undefined, message = "Record not found"): T =>
  value ?? fail(404, "NOT_FOUND", message);
const textValue = (value: unknown, min = 1, max = 200) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(422, "VALIDATION_ERROR", `Text must contain ${min}–${max} characters`);
  return (value as string).trim();
};
function initialStore(): Store {
  return {
    schema: 1,
    users: [],
    identities: {},
    tokens: {},
    assets: {},
    games: structuredClone(catalog),
    quotes: [],
    sessions: [],
    fighters: [],
    fights: [],
    quests: initialQuests(),
    records: [],
    rewards: [],
    notices: [],
    ledger: [],
    audit: [],
    settings: {
      version: 1,
      maintenance: false,
      gameCostAtomic: "25",
      maxFighters: 3,
    },
    keys: {},
  };
}
declare global {
  var winsDemoQueue: Promise<unknown> | undefined;
}
const storeFile = () =>
  process.env.DEMO_DATA_FILE || path.join(process.cwd(), ".demo", "store.json");
async function load(): Promise<Store> {
  try {
    const data = JSON.parse(
      await readFile(/* turbopackIgnore: true */ storeFile(), "utf8"),
    ) as Store;
    if (data.schema !== 1 || !Array.isArray(data.users) || !data.tokens)
      throw new Error("Unsupported demo store schema");
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return initialStore();
    throw error; // Do not silently replace damaged data with seed values.
  }
}
async function save(store: Store) {
  const file = storeFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(store), {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, file);
}
function notice(
  store: Store,
  userId: string,
  type: Notice["type"],
  title: Notice["title"],
  href: string,
) {
  store.notices.unshift({
    id: id("msg"),
    userId,
    type,
    title,
    body: copy(
      "演示状态已更新，点击查看详情。",
      "Your demo activity has been updated. Open for details.",
      "デモの状態が更新されました。詳細を確認。",
      "데모 상태가 업데이트되었습니다. 자세히 보기.",
    ),
    href,
    createdAt: timestamp(),
  });
}
function ledger(
  store: Store,
  userId: string,
  assetId: string,
  amount: bigint,
  reason: string,
  businessId: string,
) {
  const balance = required(
    store.assets[userId]?.find((a) => a.assetId === assetId),
  );
  if (BigInt(balance.availableAtomic) + amount < BigInt(0))
    fail(409, "INSUFFICIENT_BALANCE", "Insufficient demo balance");
  balance.availableAtomic = (
    BigInt(balance.availableAtomic) + amount
  ).toString();
  store.ledger.unshift({
    id: id("log"),
    userId,
    assetId,
    amountAtomic: amount.toString(),
    reason,
    businessId,
    createdAt: timestamp(),
  });
  if (assetId === "POINTS") {
    const user = required(store.users.find((u) => u.id === userId));
    user.pointsExact = balance.availableAtomic;
    const points = BigInt(user.pointsExact);
    user.level =
      points >= BigInt(20000)
        ? "Platinum"
        : points >= BigInt(5000)
          ? "Gold"
          : points >= BigInt(1000)
            ? "Silver"
            : "Bronze";
  }
}
function grant(store: Store, record: Submission) {
  if (record.rewardGrantId) return;
  const quest = required(store.quests.find((q) => q.id === record.questId));
  const reward: Reward = {
    id: id("reward"),
    userId: record.userId,
    questId: quest.id,
    recordId: record.id,
    title: quest.title,
    amountAtomic: quest.rewardAmount,
    assetId: "POINTS",
    status: "eligible",
    createdAt: timestamp(),
  };
  store.rewards.unshift(reward);
  record.rewardGrantId = reward.id;
  notice(
    store,
    record.userId,
    "quest",
    copy("任务审核通过", "Quest approved", "クエスト承認", "퀘스트 승인"),
    "/rewards",
  );
}
function claim(store: Store, reward: Reward) {
  if (reward.status === "issued") return { reward };
  ledger(
    store,
    reward.userId,
    reward.assetId,
    BigInt(reward.amountAtomic),
    "quest_reward",
    reward.id,
  );
  reward.status = "issued";
  required(store.records.find((r) => r.id === reward.recordId)).status =
    "reward_claimed";
  notice(
    store,
    reward.userId,
    "reward",
    copy(
      "奖励已到账",
      "Reward received",
      "報酬を受け取りました",
      "보상이 지급되었습니다",
    ),
    "/rewards",
  );
  return { reward };
}
function advance(store: Store) {
  const now = Date.now();
  for (const s of store.sessions)
    if (s.status === "playing" && s.readyAt <= now) {
      const asset = required(
        store.assets[s.userId]?.find((a) => a.assetId === s.assetId),
      );
      asset.lockedAtomic = (
        BigInt(asset.lockedAtomic) - BigInt(s.amountAtomic)
      ).toString();
      if (BigInt(s.payoutAtomic) > BigInt(0))
        ledger(
          store,
          s.userId,
          s.assetId,
          BigInt(s.payoutAtomic),
          "game_payout",
          s.id,
        );
      s.status = "settled";
      s.version++;
      notice(
        store,
        s.userId,
        "game",
        copy(
          "演示对局已结算",
          "Demo round settled",
          "デモゲーム精算完了",
          "데모 게임 정산 완료",
        ),
        `/games/coin-flip?session=${s.id}`,
      );
    }
  for (const f of store.fighters)
    if (f.status === "generating" && f.readyAt <= now) {
      f.status = f.simulateFailure ? "failed" : "ready";
      if (f.status === "failed" && !f.refunded) {
        ledger(store, f.userId, "TICKET", BigInt(1), "generation_refund", f.id);
        f.refunded = true;
      }
      notice(
        store,
        f.userId,
        "fighter",
        f.status === "ready"
          ? copy(
              "角色准备就绪",
              "Fighter ready",
              "ファイター準備完了",
              "파이터 준비 완료",
            )
          : copy(
              "生成失败，票券已返还",
              "Generation failed; ticket returned",
              "生成失敗・チケット返却済み",
              "생성 실패, 티켓 반환 완료",
            ),
        `/fighters/${f.id}`,
      );
    }
  for (const f of store.fights) {
    if (f.status === "queued" && f.readyAt - 3000 <= now) {
      f.status = "live";
      f.version++;
    }
    if (f.status === "live" && f.readyAt <= now) {
      f.status = "settled";
      f.version++;
      if (f.won)
        ledger(store, f.userId, "IP", FIGHT_WIN_AMOUNT, "fight_reward", f.id);
      notice(
        store,
        f.userId,
        "fighter",
        copy(
          "模拟对战已结束",
          "Demo fight finished",
          "デモ対戦終了",
          "데모 대전 종료",
        ),
        `/fights/${f.id}`,
      );
    }
  }
}
function page<T>(items: T[], url: URL) {
  const p = Number(url.searchParams.get("page") || 1),
    size = Number(url.searchParams.get("pageSize") || 12);
  if (
    !Number.isInteger(p) ||
    p < 1 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  )
    fail(422, "VALIDATION_ERROR", "Invalid pagination");
  return {
    items: items.slice((p - 1) * size, p * size),
    pagination: {
      page: p,
      pageSize: size,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
    },
  };
}
function cursor<T extends { id: string }>(items: T[], url: URL) {
  const key = url.searchParams.get("cursor");
  const index = key ? items.findIndex((item) => item.id === key) : -1;
  if (key && index < 0) fail(409, "CURSOR_EXPIRED", "Refresh this list");
  const size = 12,
    start = index + 1,
    result = items.slice(start, start + size);
  return {
    items: result,
    hasMore: start + size < items.length,
    nextCursor: start + size < items.length ? result.at(-1)?.id ?? null : null,
  };
}
const period = (q: Quest) =>
  q.type === "daily" ? timestamp().slice(0, 10) : "once";
const activeRecord = (store: Store, userId: string, q: Quest) =>
  store.records.find(
    (r) =>
      r.userId === userId && r.questId === q.id && r.periodKey === period(q),
  );

export interface DemoRequest {
  method: string;
  url: string;
  token?: string;
  body?: Record<string, unknown>;
  key?: string;
}
export async function handleDemoRequest(
  request: DemoRequest,
): Promise<unknown> {
  const task = (globalThis.winsDemoQueue ?? Promise.resolve()).then(
    async () => {
      const store = await load();
      advance(store);
      const result = dispatch(store, request);
      await save(store);
      return result;
    },
  );
  globalThis.winsDemoQueue = task.catch(() => undefined);
  return task;
}
function dispatch(store: Store, request: DemoRequest): unknown {
  const { method, token, key } = request;
  const body = request.body ?? {};
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/v1\/?/, "").replace(/\/$/, "");
  const parts = route.split("/");
  const session = token ? store.tokens[hash(token)] : undefined;
  const validSession =
    session && session.expiresAt > Date.now() ? session : undefined;
  const isAdmin = validSession?.domain === "admin";
  const user =
    validSession?.domain === "user"
      ? store.users.find((u) => u.id === validSession.userId)
      : undefined;
  const adminRoute = route.startsWith("admin/");
  const isPublic =
    method === "GET" &&
    (route.startsWith("public/") ||
      route === "games" ||
      /^games\/[^/]+$/.test(route) ||
      route === "quests" ||
      /^quests\/[^/]+$/.test(route) ||
      route === "membership/levels" ||
      route.startsWith("leaderboards/") ||
      route === "live-wins" ||
      route.startsWith("tournaments"));
  if (route === "auth/demo-login" && method === "POST") {
    const secret =
      typeof body.resumeSecret === "string"
        ? body.resumeSecret
        : randomBytes(32).toString("hex");
    let account = store.users.find(
      (u) => u.id === store.identities[hash(secret)],
    );
    if (body.resumeSecret && !account)
      fail(
        401,
        "UNAUTHORIZED",
        "Demo identity expired. Create a new demo account.",
      );
    if (!account) {
      account = {
        id: id("usr"),
        nickname: textValue(body.nickname || "Explorer", 2, 32),
        walletAddress: "",
        invitationCode: `WINS-${randomBytes(4).toString("hex").toUpperCase()}`,
        pointsExact: "0",
        level: "Bronze",
        createdAt: timestamp(),
        status: "normal",
      };
      if (body.ref) {
        const inviter = store.users.find(
          (u) => u.invitationCode === String(body.ref).toUpperCase(),
        );
        if (inviter) account.inviterId = inviter.id;
      }
      store.users.push(account);
      store.identities[hash(secret)] = account.id;
      store.assets[account.id] = ["SSC", "IP", "TICKET", "POINTS"].map(
        (symbol) => ({
          assetId: symbol,
          symbol,
          decimals: 0,
          chainId: "demo",
          availableAtomic: "0",
          lockedAtomic: "0",
        }),
      );
      ledger(store, account.id, "SSC", BigInt(1000), "demo_credit", account.id);
      ledger(store, account.id, "TICKET", BigInt(3), "demo_credit", account.id);
      notice(
        store,
        account.id,
        "system",
        copy(
          "欢迎来到 TCK Wins",
          "Welcome to TCK Wins",
          "TCK Winsへようこそ",
          "TCK Wins에 오신 것을 환영합니다",
        ),
        "/dashboard",
      );
    }
    if (account.status !== "normal") fail(403, "USER_FROZEN", "Account frozen");
    const accessToken = randomBytes(32).toString("hex");
    store.tokens[hash(accessToken)] = {
      userId: account.id,
      domain: "user",
      expiresAt: Date.now() + 86400000,
    };
    return { user: account, accessToken, resumeSecret: secret };
  }
  if (route === "admin/auth/login" && method === "POST") {
    const expected = process.env.DEMO_ADMIN_PASSWORD;
    if (!expected)
      fail(503, "FEATURE_DISABLED", "Set DEMO_ADMIN_PASSWORD in .env.local");
    if (
      body.username !== "admin" ||
      !timingSafeEqual(
        Buffer.from(hash(String(body.password))),
        Buffer.from(hash(expected!)),
      )
    )
      fail(401, "UNAUTHORIZED", "Invalid administrator credentials");
    const accessToken = randomBytes(32).toString("hex");
    store.tokens[hash(accessToken)] = {
      userId: "demo_admin",
      domain: "admin",
      expiresAt: Date.now() + 28800000,
    };
    return {
      accessToken,
      admin: { id: "demo_admin", username: "admin", role: "demo_admin" },
    };
  }
  if (!isPublic) {
    if (adminRoute ? !isAdmin : !user)
      fail(401, "UNAUTHORIZED", "Please sign in");
    if (user?.status !== undefined && user.status !== "normal")
      fail(403, "USER_FROZEN", "Account frozen");
  }
  if (route === "admin/auth/me" && method === "GET")
    return {
      admin: { id: "demo_admin", username: "admin", role: "demo_admin" },
    };
  if (
    (route === "auth/logout" || route === "admin/auth/logout") &&
    method === "POST"
  ) {
    delete store.tokens[hash(token!)];
    return { loggedOut: true };
  }
  const changing = method !== "GET";
  const needsKey =
    changing && !route.endsWith("/read") && route !== "notifications/read-all";
  const operation = `${validSession?.domain}:${validSession?.userId}:${method}:${route}:${key}`;
  const requestHash = hash(JSON.stringify(body));
  if (needsKey) {
    if (!key || key.length > 120)
      fail(422, "IDEMPOTENCY_KEY_REQUIRED", "An idempotency key is required");
    const previous = store.keys[operation];
    if (previous) {
      if (previous.hash !== requestHash)
        fail(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Key was used with different parameters",
        );
      return previous.data;
    }
  }
  const data = execute();
  if (needsKey)
    store.keys[operation] = { hash: requestHash, data: structuredClone(data) };
  return data;

  function execute(): unknown {
    const uid = user?.id ?? "";
    const mine = <T extends { userId: string }>(items: T[]) =>
      items.filter((x) => x.userId === uid);
    const own = <T extends { userId: string; id: string }>(
      items: T[],
      itemId: string,
    ) => required(items.find((x) => x.id === itemId && x.userId === uid));
    if (method === "GET") {
      if (route === "public/config")
        return {
          ...publicPresentation(store.games),
          features: {
            demoLogin: true,
            fighterFailureSimulation: true,
            payments: false,
            tournaments: false,
            noova: false,
          },
        };
      if (route === "public/home-summary")
        return {
          games: store.games.length,
          rounds: store.sessions.filter((s) => s.status === "settled").length,
          fighters: store.fighters.filter((f) => f.status === "ready").length,
          members: store.users.length,
        };
      if (route === "games")
        return page(
          store.games.filter(
            (g) =>
              (!url.searchParams.get("gameKind") ||
                g.kind === url.searchParams.get("gameKind")) &&
              [
                "slug",
                "kind",
                "chainId",
                "assetId",
                "entryId",
                "mode",
                "status",
              ].every(
                (k) =>
                  !url.searchParams.get(k) ||
                  String(g[k as keyof Game]) === url.searchParams.get(k),
              ),
          ),
          url,
        );
      if (parts[0] === "games" && parts.length === 2)
        return { game: required(store.games.find((g) => g.id === parts[1])) };
      if (route === "live-wins")
        return cursor(
          store.sessions
            .filter((s) => s.status === "settled" && s.won)
            .map((s) => ({
              id: s.id,
              gameId: s.gameId,
              payoutAtomic: s.payoutAtomic,
              assetId: s.assetId,
              createdAt: s.createdAt,
              source: "demo",
              nickname: `Explorer · ${s.userId.slice(-4)}`,
            })),
          url,
        );
      if (route === "auth/me" || route === "users/me") return { user };
      if (route === "dashboard/me")
        return {
          user,
          assets: store.assets[uid],
          sessions: mine(store.sessions).slice(0, 4),
          fighters: mine(store.fighters),
          unread: mine(store.notices).filter((n) => !n.readAt).length,
          completedQuests: mine(store.records).filter((r) =>
            ["completed", "reward_claimed"].includes(r.status),
          ).length,
          claimable: mine(store.rewards).filter((r) => r.status === "eligible")
            .length,
        };
      if (route === "assets/me") return { items: store.assets[uid] };
      if (route === "assets/me/ledger")
        return cursor(
          mine(store.ledger).filter(
            (l) =>
              !url.searchParams.get("assetId") ||
              l.assetId === url.searchParams.get("assetId"),
          ),
          url,
        );
      if (route === "game-sessions/me")
        return cursor(mine(store.sessions), url);
      if (parts[0] === "game-sessions")
        return { session: own(store.sessions, parts[1]) };
      if (route === "fighters/me")
        return {
          items: mine(store.fighters),
          limit: store.settings.maxFighters,
        };
      if (parts[0] === "fighters")
        return { fighter: own(store.fighters, parts[1]) };
      if (route === "fights/me")
        return cursor(
          mine(store.fights).map((f) => ({ ...f, ...fightReward(f) })),
          url,
        );
      if (parts[0] === "fights") {
        const fight = own(store.fights, parts[1]);
        return { fight: { ...fight, ...fightReward(fight) } };
      }
      if (route === "quests")
        return page(
          store.quests
            .filter((q) => q.status === "published")
            .map((q) => ({
              ...q,
              userStatus: activeRecord(store, uid, q)?.status || "not_started",
            }))
            .filter(
              (q) =>
                (!url.searchParams.get("type") ||
                  q.type === url.searchParams.get("type")) &&
                (!url.searchParams.get("status") ||
                  q.userStatus === url.searchParams.get("status")),
            ),
          url,
        );
      if (parts[0] === "quests" && parts.length === 2) {
        const quest = required(
          store.quests.find(
            (q) => q.id === parts[1] && q.status === "published",
          ),
        );
        return { quest, record: activeRecord(store, uid, quest) ?? null };
      }
      if (route === "rewards/me") return page(mine(store.rewards), url);
      if (route === "tickets/me")
        return {
          balance: store.assets[uid].find((a) => a.assetId === "TICKET"),
          ...cursor(
            mine(store.ledger).filter((l) => l.assetId === "TICKET"),
            url,
          ),
        };
      if (route === "notifications/unread-count")
        return { count: mine(store.notices).filter((n) => !n.readAt).length };
      if (route === "notifications")
        return {
          ...cursor(
            mine(store.notices).filter(
              (n) =>
                (!url.searchParams.get("type") ||
                  n.type === url.searchParams.get("type")) &&
                (url.searchParams.get("unread") !== "true" || !n.readAt),
            ),
            url,
          ),
          snapshotIds: mine(store.notices)
            .filter((n) => !n.readAt)
            .map((n) => n.id),
        };
      if (route === "users/me/point-logs")
        return page(
          mine(store.ledger).filter((l) => l.assetId === "POINTS"),
          url,
        );
      if (route === "users/me/quest-records")
        return page(mine(store.records), url);
      if (route === "invitations/me") {
        const invitees = store.users.filter((u) => u.inviterId === uid);
        return {
          invitationUrl: `https://tck666.cc/?ref=${user!.invitationCode}`,
          totalInvited: invitees.length,
          effectiveInvited: invitees.filter((u) =>
            store.records.some(
              (r) =>
                r.userId === u.id &&
                ["completed", "reward_claimed"].includes(r.status),
            ),
          ).length,
          ...page(
            invitees.map((u) => ({
              id: u.id,
              nickname: u.nickname,
              createdAt: u.createdAt,
            })),
            url,
          ),
        };
      }
      if (route.startsWith("leaderboards/")) {
        const metric = parts[1];
        const ranked = store.users
          .map((u) => ({
            id: u.id,
            nickname: u.nickname,
            level: u.level,
            value:
              metric === "quests"
                ? String(
                    store.records.filter(
                      (r) =>
                        r.userId === u.id &&
                        ["completed", "reward_claimed"].includes(r.status),
                    ).length,
                  )
                : metric === "invitations"
                  ? String(
                      store.users.filter((x) => x.inviterId === u.id).length,
                    )
                  : u.pointsExact,
          }))
          .sort((a, b) =>
            BigInt(a.value) > BigInt(b.value)
              ? -1
              : BigInt(a.value) < BigInt(b.value)
                ? 1
                : a.id.localeCompare(b.id),
          )
          .map((u, i) => ({ ...u, rank: i + 1 }));
        return page(ranked, url);
      }
      if (route === "membership/levels")
        return {
          items: [
            { level: "Bronze", points: "0" },
            { level: "Silver", points: "1000" },
            { level: "Gold", points: "5000" },
            { level: "Platinum", points: "20000" },
            { level: "Genesis", points: null },
          ],
        };
      if (route === "membership/me")
        return {
          level: user!.level,
          pointsExact: user!.pointsExact,
          tckBalance: "0",
          source: "demo",
        };
      if (route.startsWith("tournaments")) return { items: [], enabled: false };
      if (route === "admin/overview")
        return {
          users: store.users.length,
          rounds: store.sessions.length,
          pending: store.records.filter((r) => r.status === "pending_review")
            .length,
          issued: store.rewards.filter((r) => r.status === "issued").length,
        };
      if (route === "admin/users")
        return page(
          store.users.filter(
            (u) =>
              (!url.searchParams.get("status") ||
                u.status === url.searchParams.get("status")) &&
              (!url.searchParams.get("level") ||
                u.level === url.searchParams.get("level")) &&
              (!url.searchParams.get("keyword") ||
                `${u.nickname} ${u.id}`
                  .toLowerCase()
                  .includes(url.searchParams.get("keyword")!.toLowerCase())),
          ),
          url,
        );
      if (parts[0] === "admin" && parts[1] === "users" && parts[2]) {
        const target = required(store.users.find((u) => u.id === parts[2]));
        return {
          user: target,
          assets: store.assets[target.id],
          records: store.records.filter((r) => r.userId === target.id),
        };
      }
      if (route === "admin/quests")
        return page(
          store.quests.filter(
            (q) =>
              (!url.searchParams.get("status") ||
                q.status === url.searchParams.get("status")) &&
              (!url.searchParams.get("type") ||
                q.type === url.searchParams.get("type")),
          ),
          url,
        );
      if (route === "admin/quest-records")
        return page(
          store.records.filter(
            (r) =>
              !url.searchParams.get("reviewStatus") ||
              r.status === url.searchParams.get("reviewStatus"),
          ),
          url,
        );
      if (route === "admin/points/logs")
        return page(
          store.ledger.filter(
            (l) =>
              l.assetId === "POINTS" &&
              (!url.searchParams.get("userId") ||
                l.userId === url.searchParams.get("userId")) &&
              (!url.searchParams.get("source") ||
                l.reason === url.searchParams.get("source")),
          ),
          url,
        );
      if (route === "admin/settings") return store.settings;
      if (route === "admin/games") return page(store.games, url);
      if (route === "admin/game-sessions") return page(store.sessions, url);
      if (route === "admin/fighters") return page(store.fighters, url);
      if (route === "admin/fights") return page(store.fights, url);
      if (route === "admin/rewards/batches") return page(store.rewards, url);
      if (route === "admin/audit-logs") return page(store.audit, url);
      if (route === "admin/invitations")
        return page(
          store.users
            .filter((u) => u.inviterId)
            .map((u) => ({
              id: u.id,
              nickname: u.nickname,
              inviterId: u.inviterId,
              createdAt: u.createdAt,
            })),
          url,
        );
      if (
        [
          "admin/orders",
          "admin/settlements",
          "admin/tournaments",
          "admin/import-batches",
          "admin/legacy-identities",
        ].includes(route)
      )
        return page([], url);
    }
    if (method === "PATCH" && route === "users/me") {
      user!.nickname = textValue(body.nickname, 2, 32);
      return { user };
    }
    if (method === "POST" && parts[0] === "games" && parts[2] === "quotes") {
      const game = required(store.games.find((g) => g.id === parts[1]));
      if (store.settings.maintenance || game.status !== "available")
        fail(409, "FEATURE_DISABLED", "Game unavailable");
      if (!["heads", "tails"].includes(String(body.choice)))
        fail(422, "VALIDATION_ERROR", "Choose heads or tails");
      const quote: Quote = {
        id: id("quote"),
        userId: uid,
        gameId: game.id,
        choice: body.choice as Quote["choice"],
        amountAtomic: game.costAtomic,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        ruleVersion: game.version,
      };
      store.quotes.push(quote);
      return { quote };
    }
    if (method === "POST" && parts[0] === "games" && parts[2] === "sessions") {
      if (store.settings.maintenance)
        fail(409, "FEATURE_DISABLED", "Game unavailable");
      const quote = own(store.quotes, String(body.quoteId));
      if (quote.gameId !== parts[1])
        fail(422, "VALIDATION_ERROR", "Quote belongs to another game");
      if (quote.consumedBy)
        return { session: own(store.sessions, quote.consumedBy) };
      if (new Date(quote.expiresAt).getTime() < Date.now())
        fail(409, "QUOTE_EXPIRED", "Quote expired. Request a new quote.");
      const outcome = randomInt(2) ? "heads" : "tails",
        sessionId = id("round");
      ledger(
        store,
        uid,
        "SSC",
        -BigInt(quote.amountAtomic),
        "game_entry",
        sessionId,
      );
      const asset = required(
        store.assets[uid].find((a) => a.assetId === "SSC"),
      );
      asset.lockedAtomic = (
        BigInt(asset.lockedAtomic) + BigInt(quote.amountAtomic)
      ).toString();
      const gameSession: GameSession = {
        id: sessionId,
        userId: uid,
        gameId: quote.gameId,
        choice: quote.choice,
        outcome,
        won: outcome === quote.choice,
        status: "playing",
        amountAtomic: quote.amountAtomic,
        payoutAtomic:
          outcome === quote.choice
            ? (BigInt(quote.amountAtomic) * BigInt(2)).toString()
            : "0",
        assetId: "SSC",
        readyAt: Date.now() + 2200,
        createdAt: timestamp(),
        version: 1,
      };
      store.sessions.unshift(gameSession);
      quote.consumedBy = sessionId;
      return { session: gameSession };
    }
    if (
      method === "POST" &&
      (route === "fighters" || /^fighters\/[^/]+\/retry$/.test(route))
    ) {
      let existing: Fighter | undefined;
      if (parts[2] === "retry") {
        existing = own(store.fighters, parts[1]);
        if (existing.status !== "failed")
          fail(409, "STATE_CONFLICT", "Only failed generation can be retried");
      }
      if (
        mine(store.fighters).filter((f) => f.status !== "failed").length >=
        store.settings.maxFighters
      )
        fail(409, "FIGHTER_LIMIT_REACHED", "Fighter limit reached");
      const name = existing?.name ?? textValue(body.name, 2, 24);
      const style = existing?.style ?? body.style;
      if (!["striker", "guardian", "tactician"].includes(String(style)))
        fail(422, "VALIDATION_ERROR", "Invalid fighter style");
      const fighterId = existing?.id ?? id("fighter");
      ledger(store, uid, "TICKET", -BigInt(1), "fighter_creation", fighterId);
      const fighter: Fighter = {
        id: fighterId,
        userId: uid,
        name,
        style: style as Fighter["style"],
        status: "generating",
        power: randomInt(55, 96),
        speed: randomInt(55, 96),
        defense: randomInt(55, 96),
        readyAt: Date.now() + 4000,
        createdAt: existing?.createdAt ?? timestamp(),
        simulateFailure: !existing && body.simulateFailure === true,
        refunded: false,
      };
      if (existing) Object.assign(existing, fighter);
      else store.fighters.unshift(fighter);
      return { fighter };
    }
    if (method === "POST" && route === "fights/queue") {
      const fighter = own(store.fighters, String(body.fighterId));
      if (fighter.status !== "ready")
        fail(409, "STATE_CONFLICT", "Fighter is not ready");
      if (
        store.fights.some(
          (f) => f.fighterId === fighter.id && f.status !== "settled",
        )
      )
        fail(409, "FIGHTER_BUSY", "Fighter is already in a match");
      const fight: Fight = {
        assetId: "IP",
        payoutAtomic: "0",
        id: id("fight"),
        userId: uid,
        fighterId: fighter.id,
        opponent: "NOVA · Training bot",
        status: "queued",
        won: Boolean(randomInt(2)),
        readyAt: Date.now() + 6500,
        createdAt: timestamp(),
        version: 1,
      };
      store.fights.unshift(fight);
      return { fight };
    }
    if (method === "POST" && parts[0] === "quests" && parts[2] === "submit") {
      const quest = required(store.quests.find((q) => q.id === parts[1]));
      if (
        quest.status !== "published" ||
        Date.parse(quest.startTime) > Date.now() ||
        Date.parse(quest.endTime) < Date.now()
      )
        fail(409, "QUEST_EXPIRED", "Quest is unavailable");
      const previous = activeRecord(store, uid, quest);
      if (previous && previous.status !== "rejected")
        fail(409, "STATE_CONFLICT", "Quest already submitted");
      const proof =
        quest.type === "daily"
          ? "daily-check-in"
          : textValue(body.proof, 10, 2000);
      if (
        quest.id === "first-game" &&
        !store.sessions.some(
          (s) => s.id === proof && s.userId === uid && s.status === "settled",
        )
      )
        fail(422, "VALIDATION_ERROR", "Submit your completed round ID");
      const record: Submission = previous ?? {
        id: id("submission"),
        userId: uid,
        questId: quest.id,
        periodKey: period(quest),
        status: "pending_review",
        proof,
        version: 0,
        submittedAt: timestamp(),
        history: [],
      };
      if (previous)
        record.history.push({
          proof: previous.proof,
          reason: previous.rejectReason,
          submittedAt: previous.submittedAt,
        });
      record.proof = proof;
      record.rejectReason = undefined;
      record.version++;
      record.submittedAt = timestamp();
      record.status =
        quest.reviewMode === "auto" ? "completed" : "pending_review";
      if (!previous) store.records.unshift(record);
      if (record.status === "completed") grant(store, record);
      return { record };
    }
    if (method === "POST" && parts[0] === "quests" && parts[2] === "claim") {
      const quest = required(store.quests.find((q) => q.id === parts[1]));
      const record = activeRecord(store, uid, quest);
      if (!record?.rewardGrantId)
        fail(409, "REWARD_NOT_ELIGIBLE", "Reward not eligible");
      return claim(store, own(store.rewards, record!.rewardGrantId!));
    }
    if (method === "POST" && parts[0] === "rewards" && parts[2] === "claim")
      return claim(store, own(store.rewards, parts[1]));
    if (
      method === "PATCH" &&
      parts[0] === "notifications" &&
      parts[2] === "read"
    ) {
      const item = own(store.notices, parts[1]);
      item.readAt ??= timestamp();
      return { notification: item };
    }
    if (method === "POST" && route === "notifications/read-all") {
      if (!Array.isArray(body.ids) || body.ids.length > 10000)
        fail(422, "VALIDATION_ERROR", "Invalid notification snapshot");
      const ids = new Set(body.ids as string[]);
      mine(store.notices)
        .filter((n) => ids.has(n.id))
        .forEach((n) => {
          n.readAt ??= timestamp();
        });
      return { read: true };
    }
    if (isAdmin && changing) {
      let result: unknown;
      if (
        parts[1] === "quest-records" &&
        parts[3] === "review" &&
        method === "POST"
      ) {
        const record = required(store.records.find((r) => r.id === parts[2]));
        if (
          record.status !== "pending_review" ||
          body.version !== record.version
        )
          fail(409, "VERSION_CONFLICT", "Submission has changed");
        if (!["approve", "reject"].includes(String(body.action)))
          fail(422, "VALIDATION_ERROR", "Invalid review action");
        record.status = body.action === "approve" ? "completed" : "rejected";
        record.version++;
        if (record.status === "completed") grant(store, record);
        else {
          record.rejectReason = textValue(body.reason, 3, 500);
          notice(
            store,
            record.userId,
            "quest",
            copy(
              "任务需要补充资料",
              "Quest needs changes",
              "クエストの修正が必要",
              "퀘스트 수정 필요",
            ),
            `/quests/${record.questId}`,
          );
        }
        result = { record };
      } else if (route === "admin/points/adjust" && method === "POST") {
        const target = required(store.users.find((u) => u.id === body.userId));
        const amount = textValue(body.changeAmount, 1, 10),
          reason = textValue(body.reason, 3, 300);
        if (
          !/^-?\d+$/.test(amount) ||
          BigInt(amount) === BigInt(0) ||
          BigInt(amount) > BigInt(1000000) ||
          BigInt(amount) < -BigInt(1000000)
        )
          fail(
            422,
            "AMOUNT_OUT_OF_RANGE",
            "Adjustment must be a nonzero integer within 1,000,000",
          );
        ledger(
          store,
          target.id,
          "POINTS",
          BigInt(amount),
          "admin_adjustment",
          id("adjust"),
        );
        result = { user: target, reason };
      } else if (
        parts[1] === "quests" &&
        (method === "POST" || method === "PATCH")
      ) {
        const existing = parts[2]
          ? required(store.quests.find((q) => q.id === parts[2]))
          : undefined;
        if (existing && body.version !== existing.version)
          fail(409, "VERSION_CONFLICT", "Quest has changed");
        const title = textValue(body.title, 2, 100),
          description = textValue(body.description, 10, 2000),
          amount = textValue(body.rewardAmount, 1, 7);
        if (
          !/^\d+$/.test(amount) ||
          BigInt(amount) > BigInt(1000000) ||
          BigInt(amount) < BigInt(1)
        )
          fail(422, "AMOUNT_OUT_OF_RANGE", "Invalid reward");
        if (
          !["daily", "game", "social"].includes(String(body.type)) ||
          !["auto", "manual"].includes(String(body.reviewMode)) ||
          !["draft", "published", "offline"].includes(String(body.status))
        )
          fail(422, "VALIDATION_ERROR", "Invalid quest configuration");
        const startTime = String(body.startTime),
          endTime = String(body.endTime);
        if (
          !Number.isFinite(Date.parse(startTime)) ||
          !Number.isFinite(Date.parse(endTime)) ||
          Date.parse(endTime) <= Date.parse(startTime)
        )
          fail(422, "VALIDATION_ERROR", "Invalid quest period");
        const quest: Quest = {
          id: existing?.id ?? id("quest"),
          title: {
            ...(existing?.title ?? copy(title, title, title, title)),
            zh: title,
          },
          description: {
            ...(existing?.description ??
              copy(description, description, description, description)),
            zh: description,
          },
          type: body.type as Quest["type"],
          reviewMode: body.reviewMode as Quest["reviewMode"],
          rewardType: "points",
          rewardAmount: amount,
          status: body.status as Quest["status"],
          startTime,
          endTime,
          version: (existing?.version ?? 0) + 1,
        };
        if (existing) Object.assign(existing, quest);
        else store.quests.unshift(quest);
        result = { quest };
      } else if (route === "admin/settings" && method === "PATCH") {
        if (body.version !== store.settings.version)
          fail(409, "VERSION_CONFLICT", "Settings have changed");
        const amount = textValue(body.gameCostAtomic, 1, 4),
          limit = Number(body.maxFighters);
        if (
          !/^\d+$/.test(amount) ||
          BigInt(amount) < BigInt(1) ||
          BigInt(amount) > BigInt(1000) ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 10 ||
          typeof body.maintenance !== "boolean"
        )
          fail(422, "VALIDATION_ERROR", "Invalid settings");
        store.settings = {
          version: store.settings.version + 1,
          maintenance: body.maintenance as boolean,
          gameCostAtomic: amount,
          maxFighters: limit,
        };
        store.games[0].costAtomic = amount;
        store.games[0].version++;
        result = store.settings;
      } else return fail(404, "NOT_FOUND", "Operation is not available");
      store.audit.unshift({
        id: id("audit"),
        actor: "demo_admin",
        action: `${method} ${route}`,
        target: String(body.userId || parts[2] || "configuration"),
        reason: String(body.reason || body.action || "configuration update"),
        createdAt: timestamp(),
      });
      return result;
    }
    return fail(404, "NOT_FOUND", "API route is not available");
  }
}
