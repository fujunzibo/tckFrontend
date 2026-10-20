"use client";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { AdminShell } from "../components";
import { useAuth } from "../auth";
import { useSite } from "../site";
import { useCopy } from "../lib/copy";
import { useAction, useApi, useFilters } from "../lib/hooks";
import { formatAtomic } from "../lib/amount";
import type {
  Asset,
  Audit,
  Fight,
  Fighter,
  Game,
  GameSession,
  Ledger,
  Page,
  Quest,
  Reward,
  Settings,
  Submission,
  User,
} from "../lib/contracts";
import {
  AssetCards,
  DataState,
  Heading,
  Icon,
  Pager,
  Roadmap,
  Stats,
  Status,
} from "../ui/primitives";
import { Leaderboard } from "./member";

const names: Record<string, string> = {
  overview: "dashboard",
  users: "users",
  games: "games",
  "game-sessions": "history",
  fighters: "fighters",
  fights: "fight",
  quests: "quests",
  "quest-reviews": "reviews",
  points: "points",
  rewards: "rewards",
  invitations: "invite",
  leaderboards: "leaderboard",
  settings: "settings",
  "audit-logs": "audit",
  orders: "orders",
  settlements: "settlements",
  tournaments: "tournaments",
  "import-batches": "imports",
  "legacy-identities": "identities",
  noova: "noova",
};
export default function AdminPage({
  section = "overview",
  id,
}: {
  section?: string;
  id?: string;
}) {
  const { t } = useCopy();
  return (
    <AdminShell>
      <Heading
        title={t(names[section] ?? section)}
        eyebrow="TCK WINS / OPERATIONS"
      />
      {id ? (
        <UserDetail id={id} />
      ) : section === "overview" ? (
        <Overview />
      ) : section === "users" ? (
        <Users />
      ) : section === "quests" ? (
        <AdminQuests />
      ) : section === "quest-reviews" ? (
        <Reviews />
      ) : section === "points" ? (
        <Points />
      ) : section === "settings" ? (
        <AdminSettings />
      ) : section === "leaderboards" ? (
        <Leaderboard />
      ) : ["orders", "settlements", "tournaments", "noova"].includes(
          section,
        ) ? (
        <Roadmap
          title={t(names[section])}
          stage={section === "noova" ? "P2" : "P1"}
        />
      ) : (
        <Resources section={section} />
      )}
    </AdminShell>
  );
}
function Overview() {
  const { t, line } = useCopy();
  const data = useApi<{
    users: number;
    rounds: number;
    pending: number;
    issued: number;
  }>("/admin/overview", "admin");
  return (
    <DataState {...data} retry={data.reload}>
      {data.data && (
        <>
          <Stats
            items={[
              { label: t("users"), value: data.data.users, icon: "profile" },
              { label: t("history"), value: data.data.rounds, icon: "games" },
              {
                label: t("pending_review"),
                value: data.data.pending,
                icon: "quests",
              },
              { label: t("issued"), value: data.data.issued, icon: "rewards" },
            ]}
          />
          <div className="admin-welcome card">
            <span className="eyebrow">OPERATIONS AT A GLANCE</span>
            <h2>
              {line(
                "从每一个真实的操作开始。",
                "Every operation, in one place.",
                "すべての運用を一か所で。",
                "모든 운영을 한곳에서.",
              )}
            </h2>
            <p>{t("adminOverviewDescription")}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/admin/quest-reviews">
                {t("reviews")}
                <Icon name="arrow" />
              </Link>
              <Link className="btn btn-secondary" href="/admin/audit-logs">
                {t("audit")}
              </Link>
            </div>
          </div>
        </>
      )}
    </DataState>
  );
}
function Table<T extends { id: string }>({
  items,
  columns,
}: {
  items: T[];
  columns: { title: string; render: (item: T) => ReactNode }[];
}) {
  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {columns.map((c, i) => (
                <td key={i}>{c.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Users() {
  const { t } = useCopy(),
    f = useFilters();
  const data = useApi<Page<User>>(`/admin/users?${f.query}`, "admin");
  return (
    <>
      <div className="filter-bar">
        <input
          aria-label={t("search")}
          className="input"
          placeholder={`${t("nickname")} / ID`}
          value={f.params.get("keyword") ?? ""}
          onChange={(e) => f.set("keyword", e.target.value)}
        />
        <select
          aria-label={t("status")}
          value={f.params.get("status") ?? ""}
          onChange={(e) => f.set("status", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["normal", "frozen"].map((s) => (
            <option value={s} key={s}>
              {t(s)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("membership")}
          value={f.params.get("level") ?? ""}
          onChange={(e) => f.set("level", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["Bronze", "Silver", "Gold", "Platinum", "Genesis"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        {data.data && (
          <>
            <Table
              items={data.data.items}
              columns={[
                {
                  title: t("user"),
                  render: (u) => (
                    <>
                      <strong>{u.nickname}</strong>
                      <small className="cell-id">{u.id}</small>
                    </>
                  ),
                },
                {
                  title: t("points"),
                  render: (u) => formatAtomic(u.pointsExact),
                },
                { title: t("membership"), render: (u) => u.level },
                {
                  title: t("status"),
                  render: (u) => <Status value={u.status} />,
                },
                {
                  title: t("details"),
                  render: (u) => (
                    <Link className="text-link" href={`/admin/users/${u.id}`}>
                      {t("view")} →
                    </Link>
                  ),
                },
              ]}
            />
            <Pager
              {...data.data.pagination}
              onChange={(p) => f.set("page", String(p))}
            />
          </>
        )}
      </DataState>
    </>
  );
}
function UserDetail({ id }: { id: string }) {
  const { t } = useCopy();
  const data = useApi<{ user: User; assets: Asset[]; records: Submission[] }>(
    `/admin/users/${id}`,
    "admin",
  );
  return (
    <DataState {...data} retry={data.reload}>
      {data.data && (
        <>
          <Link className="back-link" href="/admin/users">
            ← {t("users")}
          </Link>
          <div className="card card-pad">
            <h2>{data.data.user.nickname}</h2>
            <p className="mono">{data.data.user.id}</p>
            <Status value={data.data.user.status} />
          </div>
          <AssetCards assets={data.data.assets} />
          <h3>{t("quests")}</h3>
          <Table
            items={data.data.records}
            columns={[
              { title: t("quest"), render: (r) => r.questId },
              {
                title: t("status"),
                render: (r) => <Status value={r.status} />,
              },
              { title: t("proof"), render: (r) => r.proof },
            ]}
          />
        </>
      )}
    </DataState>
  );
}
function Reviews() {
  const { t } = useCopy(),
    f = useFilters();
  const data = useApi<Page<Submission>>(
    `/admin/quest-records?${f.query}`,
    "admin",
  );
  return (
    <>
      <div className="filter-tabs">
        {["", "pending_review", "completed", "rejected", "reward_claimed"].map(
          (s) => (
            <button
              key={s}
              className={
                (f.params.get("reviewStatus") ?? "") === s ? "active" : ""
              }
              onClick={() => f.set("reviewStatus", s)}
            >
              {t(s || "all")}
            </button>
          ),
        )}
      </div>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        <div className="stack">
          {data.data?.items.map((r) => (
            <ReviewCard key={`${r.id}:${r.version}`} record={r} />
          ))}
        </div>
        {data.data && (
          <Pager
            {...data.data.pagination}
            onChange={(p) => f.set("page", String(p))}
          />
        )}
      </DataState>
    </>
  );
}
function ReviewCard({ record: r }: { record: Submission }) {
  const { t, line } = useCopy();
  const [reason, setReason] = useState("");
  const action = useAction();
  return (
    <article className="card review-card">
      <div className="row-between">
        <div>
          <h3>{r.questId}</h3>
          <Link
            className="text-link mono small"
            href={`/admin/users/${r.userId}`}
          >
            {r.userId}
          </Link>
        </div>
        <Status value={r.status} />
      </div>
      <blockquote>{r.proof}</blockquote>
      <div className="muted small">
        v{r.version} · {new Date(r.submittedAt).toLocaleString()}
      </div>
      {r.status === "pending_review" && (
        <>
          <label>
            {t("reason")}
            <textarea
              className="textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder={line(
                "驳回时必填，至少 3 个字符。",
                "Required for rejection, at least 3 characters.",
                "却下時は3文字以上で理由を入力。",
                "거절 시 3자 이상의 사유가 필요합니다.",
              )}
            />
          </label>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              disabled={action.busy}
              onClick={() =>
                void action.run(
                  `/admin/quest-records/${r.id}/review`,
                  { action: "approve", reason, version: r.version },
                  "admin",
                )
              }
            >
              {t("approve")}
            </button>
            <button
              className="btn btn-danger"
              disabled={action.busy || reason.trim().length < 3}
              onClick={() =>
                void action.run(
                  `/admin/quest-records/${r.id}/review`,
                  { action: "reject", reason, version: r.version },
                  "admin",
                )
              }
            >
              {t("reject")}
            </button>
          </div>
        </>
      )}
      {r.rejectReason && <p className="inline-error">{r.rejectReason}</p>}
      {action.error && (
        <p className="inline-error" role="alert">
          {action.error.message}
        </p>
      )}
    </article>
  );
}
function AdminQuests() {
  const { t, c, line } = useCopy(),
    f = useFilters();
  const { admin } = useAuth();
  const config = useSite();
  const canFund =
    config.features.rewardBudgets &&
    ["system", "reward_operator"].includes(admin?.role ?? "");
  const [funding, setFunding] = useState<Quest>();
  const data = useApi<Page<Quest>>(`/admin/quests?${f.query}`, "admin");
  const [editing, setEditing] = useState<Quest | null | undefined>();
  return (
    <>
      <div className="filter-bar">
        <select
          aria-label={t("status")}
          value={f.params.get("status") ?? ""}
          onChange={(e) => f.set("status", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["published", "draft", "offline"].map((s) => (
            <option value={s} key={s}>
              {t(s)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("type")}
          value={f.params.get("type") ?? ""}
          onChange={(e) => f.set("type", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["daily", "game", "social"].map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={() => setEditing(null)}>
          + {t("create")}
        </button>
      </div>
      {editing !== undefined && (
        <QuestEditor
          key={editing?.id ?? "new"}
          quest={editing}
          done={() => setEditing(undefined)}
        />
      )}
      {funding && (
        <BudgetForm
          key={funding.id}
          quest={funding}
          done={() => setFunding(undefined)}
        />
      )}
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        {data.data && (
          <>
            <Table
              items={data.data.items}
              columns={[
                {
                  title: t("quest"),
                  render: (q) => (
                    <>
                      <strong>{c(q.title)}</strong>
                      <small className="cell-id">{q.id}</small>
                    </>
                  ),
                },
                { title: t("type"), render: (q) => t(q.type) },
                {
                  title: t("reward"),
                  render: (q) => `${q.rewardAmount} ${t("points")}`,
                },
                {
                  title: t("status"),
                  render: (q) => <Status value={q.status} />,
                },
                {
                  title: t("operation"),
                  render: (q) => (
                    <div className="row-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(q)}
                      >
                        {t("edit")}
                      </button>
                      {canFund && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => setFunding(q)}
                        >
                          {line(
                            "任务预算",
                            "Quest budget",
                            "クエスト予算",
                            "퀘스트 예산",
                          )}
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
            <Pager
              {...data.data.pagination}
              onChange={(p) => f.set("page", String(p))}
            />
          </>
        )}
      </DataState>
    </>
  );
}
function BudgetForm({ quest, done }: { quest: Quest; done: () => void }) {
  const { t, c, line } = useCopy();
  const data = useApi<{ availableAtomic: string }>(
    `/admin/quests/${quest.id}/budget`,
    "admin",
  );
  const [amount, setAmount] = useState("10000"),
    [reason, setReason] = useState("");
  const action = useAction();
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      `/admin/quests/${quest.id}/budget`,
      { amountAtomic: amount, reason },
      "admin",
    );
    if (result) done();
  }
  return (
    <form
      className="card card-pad editor-form"
      data-budget-quest={quest.id}
      onSubmit={submit}
    >
      <h3>
        {line("任务预算", "Quest budget", "クエスト予算", "퀘스트 예산")} ·{" "}
        {c(quest.title)}
      </h3>
      <DataState {...data} retry={data.reload}>
        <p>
          {t("available")}: {data.data?.availableAtomic ?? "—"} POINTS
        </p>
      </DataState>
      <p className="muted">{t("budgetDescription")}</p>
      <div className="form-grid">
        <label>
          {t("amount")} · POINTS
          <input
            className="input"
            type="text"
            inputMode="numeric"
            pattern="[1-9][0-9]{0,12}"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          {t("reason")}
          <input
            className="input"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      <div className="row-actions">
        <button
          className="btn btn-primary"
          disabled={action.busy || data.loading || Boolean(data.error)}
        >
          {t("save")}
        </button>
        <button className="btn btn-secondary" type="button" onClick={done}>
          {t("cancel")}
        </button>
      </div>
      {action.error && <p className="inline-error">{action.error.message}</p>}
    </form>
  );
}
function QuestEditor({
  quest,
  done,
}: {
  quest: Quest | null;
  done: () => void;
}) {
  const { t, line } = useCopy();
  const action = useAction();
  const [form, setForm] = useState({
    title: quest?.title.zh ?? "",
    description: quest?.description.zh ?? "",
    type: quest?.type ?? "social",
    reviewMode: quest?.reviewMode ?? "manual",
    rewardAmount: quest?.rewardAmount ?? "30",
    status: quest?.status ?? "draft",
    startTime:
      quest?.startTime.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
    endTime: quest?.endTime.slice(0, 16) ?? "2027-12-31T23:59",
  });
  const field = (key: keyof typeof form, value: string) =>
    setForm((s) => ({ ...s, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = await action.run(
      `/admin/quests${quest ? `/${quest.id}` : ""}`,
      {
        ...form,
        startTime: `${form.startTime}:00.000Z`,
        endTime: `${form.endTime}:00.000Z`,
        version: quest?.version,
      },
      "admin",
      quest ? "PATCH" : "POST",
    );
    if (result) done();
  }
  return (
    <form className="card card-pad editor-form" onSubmit={submit}>
      <div className="row-between">
        <h3>
          {t(quest ? "edit" : "create")} · {t("quest")}
        </h3>
        <button className="text-button" type="button" onClick={done}>
          {t("cancel")}
        </button>
      </div>
      <p className="muted small">
        {line(
          "运营文案编辑简中字段；新任务以该文案作为其他语言的回退。",
          "Edit the Chinese content; new quests use this as the fallback for other locales.",
          "中国語の運用文言を編集。新規タスクでは他言語の代替にも使用。",
          "중국어 콘텐츠를 편집합니다. 신규 퀘스트는 다른 언어의 대체 문구로 사용합니다.",
        )}
      </p>
      <div className="form-grid">
        <label>
          {t("name")}
          <input
            required
            className="input"
            value={form.title}
            minLength={2}
            maxLength={100}
            onChange={(e) => field("title", e.target.value)}
          />
        </label>
        <label>
          {t("amount")}
          <input
            required
            className="input"
            type="number"
            min={1}
            max={1000000}
            value={form.rewardAmount}
            onChange={(e) => field("rewardAmount", e.target.value)}
          />
        </label>
        <label>
          {t("type")}
          <select
            value={form.type}
            onChange={(e) => field("type", e.target.value)}
          >
            {["daily", "game", "social"].map((s) => (
              <option value={s} key={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("reviews")}
          <select
            value={form.reviewMode}
            onChange={(e) => field("reviewMode", e.target.value)}
          >
            {["manual", "auto"].map((s) => (
              <option value={s} key={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("status")}
          <select
            value={form.status}
            onChange={(e) => field("status", e.target.value)}
          >
            {["draft", "published", "offline"].map((s) => (
              <option value={s} key={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("start")} UTC
          <input
            className="input"
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) => field("startTime", e.target.value)}
          />
        </label>
        <label>
          {t("end")} UTC
          <input
            className="input"
            type="datetime-local"
            required
            value={form.endTime}
            onChange={(e) => field("endTime", e.target.value)}
          />
        </label>
      </div>
      <label>
        {t("description")}
        <textarea
          className="textarea"
          minLength={10}
          maxLength={2000}
          required
          value={form.description}
          onChange={(e) => field("description", e.target.value)}
        />
      </label>
      <button className="btn btn-primary" disabled={action.busy}>
        {t("save")}
      </button>
      {action.error && <p className="inline-error">{action.error.message}</p>}
    </form>
  );
}
function Points() {
  const { t } = useCopy(),
    f = useFilters();
  const users = useApi<Page<User>>("/admin/users?pageSize=100", "admin");
  const logs = useApi<Page<Ledger>>(`/admin/points/logs?${f.query}`, "admin");
  const [userId, setUserId] = useState(""),
    [amount, setAmount] = useState("100"),
    [reason, setReason] = useState("");
  const action = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = await action.run(
      "/admin/points/adjust",
      { userId, changeAmount: amount, reason },
      "admin",
    );
    if (result) setReason("");
  }
  return (
    <>
      <form className="card card-pad editor-form" onSubmit={submit}>
        <h3>
          {t("points")} · {t("edit")}
        </h3>
        <div className="form-grid">
          <label>
            {t("user")}
            <select
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">{t("user")}</option>
              {users.data?.items.map((u) => (
                <option value={u.id} key={u.id}>
                  {u.nickname} · {u.id.slice(-8)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("amount")}
            <input
              className="input"
              type="number"
              min={-1000000}
              max={1000000}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </div>
        <label>
          {t("reason")}
          <textarea
            className="textarea"
            required
            minLength={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={action.busy || !userId || Number(amount) === 0}
        >
          {t("save")}
        </button>
        {action.error && <p className="inline-error">{action.error.message}</p>}
      </form>
      <div className="filter-bar">
        <select
          aria-label={t("user")}
          value={f.params.get("userId") ?? ""}
          onChange={(e) => f.set("userId", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {users.data?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname}
            </option>
          ))}
        </select>
        <select
          aria-label={t("type")}
          value={f.params.get("source") ?? ""}
          onChange={(e) => f.set("source", e.target.value)}
        >
          <option value="">{t("all")}</option>
          <option value="quest_reward">{t("quest")}</option>
          <option value="admin_adjustment">{t("admin")}</option>
        </select>
      </div>
      <DataState
        {...logs}
        empty={logs.data?.items.length === 0}
        retry={logs.reload}
      >
        {logs.data && (
          <>
            <Table
              items={logs.data.items}
              columns={[
                {
                  title: t("user"),
                  render: (l) => (
                    <Link
                      className="text-link"
                      href={`/admin/users/${l.userId}`}
                    >
                      {l.userId.slice(-8)}
                    </Link>
                  ),
                },
                {
                  title: t("amount"),
                  render: (l) => formatAtomic(l.amountAtomic),
                },
                { title: t("reason"), render: (l) => l.reason },
                {
                  title: t("time"),
                  render: (l) => new Date(l.createdAt).toLocaleString(),
                },
              ]}
            />
            <Pager
              {...logs.data.pagination}
              onChange={(p) => f.set("page", String(p))}
            />
          </>
        )}
      </DataState>
    </>
  );
}
function AdminSettings() {
  const data = useApi<Settings>("/admin/settings", "admin");
  return (
    <DataState {...data} retry={data.reload}>
      {data.data && (
        <SettingsForm key={data.data.version} settings={data.data} />
      )}
    </DataState>
  );
}
function SettingsForm({ settings }: { settings: Settings }) {
  const { t, line } = useCopy();
  const [cost, setCost] = useState(settings.gameCostAtomic),
    [limit, setLimit] = useState(settings.maxFighters),
    [maintenance, setMaintenance] = useState(settings.maintenance);
  const action = useAction();
  async function submit(e: FormEvent) {
    e.preventDefault();
    await action.run(
      "/admin/settings",
      {
        version: settings.version,
        gameCostAtomic: cost,
        maxFighters: limit,
        maintenance,
      },
      "admin",
      "PATCH",
    );
  }
  return (
    <form className="card card-pad editor-form" onSubmit={submit}>
      <span className="tiny-tag">v{settings.version}</span>
      <h3>{t("settings")}</h3>
      <div className="form-grid">
        <label>
          Coin Flip · SSC
          <input
            className="input"
            type="number"
            min={1}
            max={1000}
            required
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label>
          {t("fighters")} · MAX
          <input
            className="input"
            type="number"
            min={1}
            max={10}
            required
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={maintenance}
          onChange={(e) => setMaintenance(e.target.checked)}
        />
        {line(
          "暂停创建新对局",
          "Pause new rounds",
          "新規ラウンドを停止",
          "새 라운드 일시 중지",
        )}
      </label>
      <p className="muted">
        {line(
          "规则修改对新报价生效，已开始的对局继续使用原规则。",
          "Changes apply to new quotes. Existing rounds keep their rules.",
          "変更は新しい見積もりに適用。既存のゲームは元のルールを維持。",
          "변경은 새 견적에 적용됩니다. 기존 라운드는 원래 규칙을 유지합니다.",
        )}
      </p>
      <button className="btn btn-primary" disabled={action.busy}>
        {t("save")}
      </button>
      {action.error && <p className="inline-error">{action.error.message}</p>}
    </form>
  );
}
type Resource =
  | Game
  | GameSession
  | Fighter
  | Fight
  | Reward
  | Audit
  | { id: string; nickname?: string; inviterId?: string; createdAt?: string };
function Resources({ section }: { section: string }) {
  const { t, c } = useCopy(),
    f = useFilters();
  const endpoint = section === "rewards" ? "rewards/batches" : section;
  const data = useApi<Page<Resource>>(`/admin/${endpoint}?${f.query}`, "admin");
  const field = (row: Resource, key: string): unknown =>
    (row as unknown as Record<string, unknown>)[key];
  function title(row: Resource) {
    if ("name" in row) return row.name;
    if ("title" in row) return c(row.title);
    if ("action" in row) return row.action;
    if ("nickname" in row) return row.nickname;
    return row.id;
  }
  return (
    <>
      {["import-batches", "legacy-identities"].includes(section) && (
        <p className="risk-note">{t("legacyDescription")}</p>
      )}
      <button className="btn btn-secondary table-refresh" onClick={data.reload}>
        {t("refresh")}
      </button>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        {data.data && (
          <>
            <Table
              items={data.data.items}
              columns={[
                {
                  title: t("details"),
                  render: (r) => (
                    <>
                      <strong>{title(r)}</strong>
                      <small className="cell-id">{r.id}</small>
                    </>
                  ),
                },
                {
                  title: t("user"),
                  render: (r) =>
                    field(r, "userId") ? (
                      <Link
                        className="text-link"
                        href={`/admin/users/${field(r, "userId")}`}
                      >
                        {String(field(r, "userId")).slice(-8)}
                      </Link>
                    ) : (
                      String(field(r, "actor") ?? field(r, "inviterId") ?? "—")
                    ),
                },
                {
                  title: t("status"),
                  render: (r) =>
                    field(r, "status") ? (
                      <Status value={String(field(r, "status"))} />
                    ) : (
                      String(field(r, "reason") ?? "—")
                    ),
                },
                {
                  title: t("amount"),
                  render: (r) =>
                    String(
                      field(r, "amountAtomic") ??
                        field(r, "costAtomic") ??
                        field(r, "payoutAtomic") ??
                        "—",
                    ),
                },
                {
                  title: t("time"),
                  render: (r) =>
                    field(r, "createdAt")
                      ? new Date(String(field(r, "createdAt"))).toLocaleString()
                      : "—",
                },
              ]}
            />
            <Pager
              {...data.data.pagination}
              onChange={(p) => f.set("page", String(p))}
            />
          </>
        )}
      </DataState>
    </>
  );
}
