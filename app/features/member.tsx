"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PageShell, RequireAuth } from "../components";
import { useAuth } from "../auth";
import { ModeBadge } from "../site";
import { useCopy } from "../lib/copy";
import { useAction, useApi, useFilters } from "../lib/hooks";
import { formatAtomic } from "../lib/amount";
import { useToast } from "../toast";
import type {
  Asset,
  CursorPage,
  Dashboard,
  Ledger,
  Notice,
  Page,
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

export function MemberPage({ page }: { page: string }) {
  const { t } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Heading title={t(page)} eyebrow="YOUR TCK WINS" />
        {page === "leaderboard" ? (
          <Leaderboard />
        ) : page === "tournaments" ? (
          <Roadmap title={t("tournaments")} />
        ) : (
          <RequireAuth>
            {page === "dashboard" ? (
              <DashboardBody />
            ) : page === "notifications" ? (
              <Notifications />
            ) : page === "tickets" ? (
              <Tickets />
            ) : page === "invite" ? (
              <Invite />
            ) : page === "profile" ? (
              <Profile />
            ) : page === "membership" ? (
              <Membership />
            ) : null}
          </RequireAuth>
        )}
      </main>
    </PageShell>
  );
}
function DashboardBody() {
  const { t, line } = useCopy();
  const data = useApi<Dashboard>("/dashboard/me");
  const d = data.data;
  return (
    <DataState {...data} retry={data.reload}>
      {d && (
        <>
          <div className="member-welcome">
            <div className="avatar-large">{d.user.nickname.slice(0, 1)}</div>
            <div>
              <h2>
                {line(
                  "欢迎回来，",
                  "Welcome back, ",
                  "おかえりなさい、",
                  "다시 오신 것을 환영합니다, ",
                )}
                {d.user.nickname}
              </h2>
              <p>
                <span className="tiny-tag">{d.user.level}</span>{" "}
                <span className="muted">{t("explorer")}</span>
              </p>
            </div>
            <Link className="btn btn-secondary" href="/profile">
              {t("profile")}
              <Icon name="arrow" />
            </Link>
          </div>
          <AssetCards assets={d.assets} />
          <div className="wins-section compact-section">
            <Stats
              items={[
                {
                  label: t("history"),
                  value: d.sessions.length,
                  note: line(
                    "最近 4 局",
                    "Latest 4 rounds",
                    "直近4ラウンド",
                    "최근 4라운드",
                  ),
                  icon: "games",
                },
                {
                  label: t("fighters"),
                  value: d.fighters.length,
                  icon: "fighters",
                },
                {
                  label: t("completed"),
                  value: d.completedQuests,
                  icon: "quests",
                },
                { label: t("eligible"), value: d.claimable, icon: "rewards" },
              ]}
            />
          </div>
          <div className="grid grid-2">
            <section className="card card-pad">
              <div className="row-between">
                <h3>{t("activity")}</h3>
                <Link href="/games/history" className="text-link">
                  {t("history")} →
                </Link>
              </div>
              {d.sessions.length ? (
                d.sessions.map((s) => (
                  <Link
                    className="record-row"
                    href={`/games/coin-flip?session=${s.id}`}
                    key={s.id}
                  >
                    <span className="record-icon">
                      <Icon name="games" />
                    </span>
                    <div>
                      <strong>Coin Flip</strong>
                      <small>{new Date(s.createdAt).toLocaleString()}</small>
                    </div>
                    <Status value={s.status} />
                  </Link>
                ))
              ) : (
                <DataState empty />
              )}
            </section>
            <section className="card card-pad highlight-card">
              <span className="eyebrow">WHAT’S NEXT?</span>
              <h2>
                {line("你的下一步", "Your next move", "次の一歩", "다음 단계")}
              </h2>
              {[
                { key: "quests", href: "/quests" },
                { key: "fighters", href: "/fighters" },
                { key: "notifications", href: "/notifications" },
              ].map((x) => (
                <Link className="next-link" href={x.href} key={x.key}>
                  <Icon name={x.key} />
                  <span>
                    {t(x.key)}
                    {x.key === "notifications" &&
                      d.unread > 0 &&
                      ` (${d.unread})`}
                  </span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </section>
          </div>
        </>
      )}
    </DataState>
  );
}
function Notifications() {
  const { t, c } = useCopy(),
    filters = useFilters();
  const data = useApi<CursorPage<Notice> & { snapshotIds: string[] }>(
    `/notifications?${filters.query}`,
  );
  const action = useAction();
  return (
    <>
      <div className="filter-bar">
        <div className="filter-tabs">
          {["", "true"].map((v) => (
            <button
              className={
                (filters.params.get("unread") ?? "") === v ? "active" : ""
              }
              key={v}
              onClick={() => filters.set("unread", v)}
            >
              {t(v ? "unread" : "all")}
            </button>
          ))}
        </div>
        <select
          aria-label={t("type")}
          value={filters.params.get("type") ?? ""}
          onChange={(e) => filters.set("type", e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["system", "game", "fighter", "quest", "reward"].map((v) => (
            <option key={v} value={v}>
              {t(v)}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary"
          disabled={action.busy || !data.data?.snapshotIds.length}
          onClick={() =>
            void action.run("/notifications/read-all", {
              ids: data.data?.snapshotIds,
            })
          }
        >
          {t("readAll")}
        </button>
      </div>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        <div className="stack">
          {data.data?.items.map((n) => (
            <article
              className={`card notification-row ${n.readAt ? "" : "is-unread"}`}
              key={n.id}
            >
              <div className="record-icon">
                <Icon
                  name={
                    n.type === "game"
                      ? "games"
                      : n.type === "reward"
                        ? "rewards"
                        : "notifications"
                  }
                />
              </div>
              <div>
                <div className="row-between">
                  <h3>{c(n.title)}</h3>
                  <small className="muted">
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
                <p>{c(n.body)}</p>
                <div className="notice-actions">
                  <Link
                    href={n.href}
                    className="text-link"
                    onClick={() => {
                      if (!n.readAt)
                        void action.run(
                          `/notifications/${n.id}/read`,
                          {},
                          "user",
                          "PATCH",
                        );
                    }}
                  >
                    {t("view")} →
                  </Link>
                  {!n.readAt && (
                    <button
                      className="text-button"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(
                          `/notifications/${n.id}/read`,
                          {},
                          "user",
                          "PATCH",
                        )
                      }
                    >
                      {t("read")}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        <CursorControls
          hasMore={data.data?.hasMore}
          nextCursor={data.data?.nextCursor}
        />
      </DataState>
    </>
  );
}
function CursorControls({
  hasMore,
  nextCursor,
}: {
  hasMore?: boolean;
  nextCursor?: string | null;
}) {
  const { t } = useCopy(),
    filters = useFilters();
  return (
    <div className="pagination">
      {filters.params.get("cursor") && (
        <button
          className="btn btn-secondary"
          onClick={() => filters.set("cursor", "")}
        >
          {t("back")}
        </button>
      )}
      {hasMore && nextCursor && (
        <button
          className="btn btn-secondary"
          onClick={() => filters.set("cursor", nextCursor)}
        >
          {t("next")}
        </button>
      )}
    </div>
  );
}
export function LedgerTable({ items }: { items: Ledger[] }) {
  const { t } = useCopy();
  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t("time")}</th>
            <th>{t("asset")}</th>
            <th>{t("amount")}</th>
            <th>{t("reason")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.assetId}</td>
              <td
                className={
                  l.amountAtomic.startsWith("-") ? "negative" : "positive"
                }
              >
                {l.amountAtomic.startsWith("-") ? "" : "+"}
                {formatAtomic(l.amountAtomic)}
              </td>
              <td>{reasonLabel(l.reason, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function reasonLabel(reason: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    game_entry: "cost",
    game_payout: "settled",
    fighter_creation: "createFighter",
    generation_refund: "failedRefund",
    quest_reward: "reward",
    fight_reward: "fight",
    admin_adjustment: "admin",
  };
  return t(map[reason] ?? reason);
}
function Tickets() {
  const { t, line } = useCopy(),
    filters = useFilters();
  const data = useApi<CursorPage<Ledger> & { balance: Asset }>(
    `/tickets/me?${filters.query}`,
  );
  return (
    <>
      <div className="ticket-banner card">
        <div className="ticket-visual">
          <Icon name="rewards" size={70} />
          <span>TCK WINS</span>
        </div>
        <div>
          <span className="eyebrow">YOUR PASS TO POSSIBILITY</span>
          <h2>
            {line(
              "一张票券，开启新体验。",
              "Your ticket to something new.",
              "新体験へのチケット。",
              "새로운 경험을 여는 티켓.",
            )}
          </h2>
          <p>{t("ticketDescription")}</p>
          <strong className="asset-number">
            {data.data?.balance.availableAtomic ?? "—"} <small>TICKET</small>
          </strong>
          <Link className="btn btn-primary" href="/fighters">
            {t("createFighter")}
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
      <h2 className="section-title">{t("ledger")}</h2>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        {data.data && <LedgerTable items={data.data.items} />}
        <CursorControls
          hasMore={data.data?.hasMore}
          nextCursor={data.data?.nextCursor}
        />
      </DataState>
    </>
  );
}
function Invite() {
  const { t, line } = useCopy(),
    filters = useFilters();
  const { showToast } = useToast();
  const data = useApi<
    Page<{ id: string; nickname: string; createdAt: string }> & {
      invitationUrl: string;
      totalInvited: number;
      effectiveInvited: number;
    }
  >(`/invitations/me?${filters.query}`);
  async function copy() {
    try {
      await navigator.clipboard.writeText(data.data?.invitationUrl ?? "");
      showToast(t("copied"));
    } catch {
      showToast(
        line(
          "复制失败，请手动选择链接。",
          "Copy failed. Select the link manually.",
          "コピーできません。リンクを手動で選択。",
          "복사 실패. 링크를 직접 선택하세요.",
        ),
        "error",
      );
    }
  }
  return (
    <DataState {...data} retry={data.reload}>
      {data.data && (
        <>
          <div className="card invite-banner">
            <span className="eyebrow">GOOD THINGS ARE BETTER TOGETHER</span>
            <h2>
              {line(
                "下一场冒险，和朋友一起。",
                "The next adventure is better together.",
                "次の冒険は、友達と一緒に。",
                "다음 모험은 친구와 함께.",
              )}
            </h2>
            <p>{t("invitationDescription")}</p>
            <div className="copy-field">
              <input
                className="input mono"
                readOnly
                value={data.data.invitationUrl}
                onFocus={(e) => e.target.select()}
              />
              <button className="btn btn-primary" onClick={() => void copy()}>
                {t("copy")}
              </button>
            </div>
          </div>
          <Stats
            items={[
              { label: t("totalInvited"), value: data.data.totalInvited },
              { label: t("effective"), value: data.data.effectiveInvited },
            ]}
          />
          <section className="wins-section compact-section">
            <h3>{t("activity")}</h3>
            <DataState empty={!data.data.items.length}>
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("nickname")}</th>
                      <th>{t("time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.items.map((u) => (
                      <tr key={u.id}>
                        <td>{u.nickname}</td>
                        <td>{new Date(u.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                {...data.data.pagination}
                onChange={(p) => filters.set("page", String(p))}
              />
            </DataState>
          </section>
        </>
      )}
    </DataState>
  );
}
export function Leaderboard() {
  const { t, line } = useCopy(),
    filters = useFilters();
  const type = filters.params.get("type") ?? "points";
  const data = useApi<
    Page<{
      id: string;
      rank: number;
      nickname: string;
      level: string;
      value: string;
    }>
  >(`/leaderboards/${type}?${filters.query}`, "public");
  return (
    <>
      <div className="leaderboard-intro">
        <Icon name="rewards" size={44} />
        <div>
          <h2>
            {line(
              "每一份参与，都值得被看见。",
              "Every contribution deserves a place.",
              "すべての貢献にスポットライトを。",
              "모든 참여는 주목받을 가치가 있습니다.",
            )}
          </h2>
          <p className="muted">{t("leaderboardDescription")}</p>
        </div>
      </div>
      <div className="filter-tabs">
        {["points", "quests", "invitations"].map((v) => (
          <button
            className={v === type ? "active" : ""}
            key={v}
            onClick={() => filters.set("type", v)}
          >
            {t(v === "invitations" ? "invite" : v)}
          </button>
        ))}
      </div>
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("nickname")}</th>
                <th>{t("membership")}</th>
                <th>{t(type === "invitations" ? "invite" : type)}</th>
              </tr>
            </thead>
            <tbody>
              {data.data?.items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className={`rank rank-${u.rank}`}>
                      {u.rank.toString().padStart(2, "0")}
                    </span>
                  </td>
                  <td>
                    <strong>{u.nickname}</strong>
                  </td>
                  <td>{u.level}</td>
                  <td className="accent">{formatAtomic(u.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.data && (
          <Pager
            {...data.data.pagination}
            onChange={(p) => filters.set("page", String(p))}
          />
        )}
      </DataState>
    </>
  );
}
function Profile() {
  const { t } = useCopy(),
    filters = useFilters();
  const { user } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const action = useAction();
  const logs = useApi<CursorPage<Ledger>>(`/assets/me/ledger?${filters.query}`);
  async function save(e: FormEvent) {
    e.preventDefault();
    await action.run<{ user: User }>(
      "/users/me",
      { nickname },
      "user",
      "PATCH",
    );
  }
  return (
    <>
      <div className="grid grid-2">
        <section className="card card-pad">
          <div className="avatar-large">{user?.nickname.slice(0, 1)}</div>
          <h2>{user?.nickname}</h2>
          <span className="tiny-tag">{user?.level}</span>{" "}
          <ModeBadge mode={user?.platformMode} />
          <p className="muted small mono">{user?.id}</p>
          <p>{t("identityDescription")}</p>
        </section>
        <form className="card card-pad" onSubmit={save}>
          <h3>{t("edit")}</h3>
          <label>
            {t("nickname")}
            <input
              className="input"
              required
              minLength={2}
              maxLength={32}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={action.busy}>
            {t("save")}
          </button>
          {action.error && (
            <p className="inline-error">{action.error.message}</p>
          )}
        </form>
      </div>
      <h2 className="section-title">{t("ledger")}</h2>
      <div className="filter-tabs">
        {["", "SSC", "IP", "TICKET", "POINTS"].map((v) => (
          <button
            className={
              (filters.params.get("assetId") ?? "") === v ? "active" : ""
            }
            key={v}
            onClick={() => filters.set("assetId", v)}
          >
            {v === "POINTS" ? t("points") : v || t("all")}
          </button>
        ))}
      </div>
      <DataState
        {...logs}
        empty={logs.data?.items.length === 0}
        retry={logs.reload}
      >
        {logs.data && <LedgerTable items={logs.data.items} />}
        <CursorControls
          hasMore={logs.data?.hasMore}
          nextCursor={logs.data?.nextCursor}
        />
      </DataState>
    </>
  );
}
function Membership() {
  const { t, line } = useCopy();
  const { user } = useAuth();
  const membership = useApi<{
    level: string;
    pointsExact: string;
    tckBalance: string;
  }>("/membership/me");
  const levels = useApi<{ items: { level: string; points: string | null }[] }>(
    "/membership/levels",
    "public",
  );
  const points = BigInt(
    membership.data?.pointsExact ?? user?.pointsExact ?? "0",
  );
  const thresholds =
    levels.data?.items.filter((level) => level.points !== null) ?? [];
  const next = thresholds.find((level) => BigInt(level.points!) > points);
  const previous = thresholds
    .filter((level) => BigInt(level.points!) <= points)
    .at(-1);
  const start = BigInt(previous?.points ?? "0");
  const progress = next
    ? Number(((points - start) * BigInt(100)) / (BigInt(next.points!) - start))
    : 100;
  return (
    <>
      <div className="card membership-current">
        <div>
          <span className="eyebrow">YOUR MEMBERSHIP</span>
          <h2>{membership.data?.level ?? user?.level}</h2>
          <p>
            {formatAtomic(points.toString())} {t("points")} · TCK{" "}
            {t("holdingLabel")}:{" "}
            {membership.data ? formatAtomic(membership.data.tckBalance) : "—"}
          </p>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
          {membership.error && (
            <p className="inline-error">{membership.error.message}</p>
          )}
        </div>
        <div className="membership-emblem">W</div>
      </div>
      <DataState {...levels} retry={levels.reload}>
        <div className="membership-grid">
          {levels.data?.items.map((l, i) => (
            <article
              className={`card level-card ${l.level === user?.level ? "current" : ""}`}
              key={l.level}
            >
              <span className="eyebrow">LEVEL 0{i + 1}</span>
              <div className="level-medal">
                <Icon name="rewards" size={36} />
              </div>
              <h3>{l.level}</h3>
              <p>
                {l.points === null
                  ? line("专属邀请", "By invitation", "招待制", "초대 전용")
                  : `${formatAtomic(l.points)} ${t("points")}`}
              </p>
              <p className="muted small">{t("membershipDescription")}</p>
            </article>
          ))}
        </div>
      </DataState>
    </>
  );
}
