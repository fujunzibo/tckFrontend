"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell, RequireAuth } from "../components";
import { useCopy } from "../lib/copy";
import { useAction, useApi, useFilters, useNow } from "../lib/hooks";
import { formatAtomic } from "../lib/amount";
import { ModeBadge, useSite } from "../site";
import type {
  CursorPage,
  Game,
  GameSession,
  Page,
  Quote,
} from "../lib/contracts";
import {
  DataState,
  GameArt,
  GameCard,
  Heading,
  Icon,
  Pager,
  Roadmap,
  Status,
} from "../ui/primitives";

export function Games() {
  const config = useSite();
  const { t, line, locale } = useCopy(),
    filters = useFilters();
  const data = useApi<Page<Game>>(`/games?${filters.query}`, "public");
  return (
    <PageShell>
      <main className="container page">
        <Heading
          eyebrow="THE PLAYGROUND"
          title={t("games")}
          description={line(
            "发现你的下一款心头好。轻松一局，即刻开始。",
            "Discover your next favorite. A new round is a click away.",
            "次のお気に入りを見つけよう。新しいラウンドをすぐに。",
            "다음 최애 게임을 발견하세요. 지금 시작하세요.",
          )}
          action={
            <Link className="btn btn-secondary" href="/games/history">
              {t("history")}
              <Icon name="clock" />
            </Link>
          }
        />
        <div className="catalog-spotlight">
          <div>
            <span className="tiny-tag">FEATURED · TCK ORIGINALS</span>
            <h2>
              One flip.
              <br />
              <span>New possibilities.</span>
            </h2>
            <p>{t("featuredGameDescription")}</p>
            <Link className="btn btn-primary" href="/games/coin-flip">
              {t("play")}
              <Icon name="arrow" />
            </Link>
          </div>
          <GameArt kind="coin_flip" large />
        </div>
        <div className="filter-bar">
          <div className="filter-tabs">
            {["", "available", "coming_soon"].map((s) => (
              <button
                className={
                  filters.params.get("status") === s ||
                  (!filters.params.get("status") && !s)
                    ? "active"
                    : ""
                }
                key={s}
                onClick={() => filters.set("status", s)}
              >
                {s === "coming_soon"
                  ? t("soon")
                  : s === "available"
                    ? t("play")
                    : t("all")}
              </button>
            ))}
          </div>
          <div className="filter-selects">
            <label>
              {t("type")}
              <select
                value={filters.params.get("gameKind") ?? ""}
                onChange={(e) => filters.set("gameKind", e.target.value)}
              >
                <option value="">{t("all")}</option>
                {config.gameKinds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("network")}
              <select
                value={filters.params.get("chainId") ?? ""}
                onChange={(e) => filters.set("chainId", e.target.value)}
              >
                <option value="">{t("all")}</option>
                {config.chains.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("asset")}
              <select
                value={filters.params.get("assetId") ?? ""}
                onChange={(e) => filters.set("assetId", e.target.value)}
              >
                <option value="">{t("all")}</option>
                {config.gameAssets.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("mode")}
              <select
                value={filters.params.get("mode") ?? ""}
                onChange={(e) => filters.set("mode", e.target.value)}
              >
                <option value="">{t("all")}</option>
                {config.modes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("entry")}
              <select
                value={filters.params.get("entryId") ?? ""}
                onChange={(e) => filters.set("entryId", e.target.value)}
              >
                <option value="">{t("all")}</option>
                {config.entries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <DataState
          {...data}
          empty={data.data?.items.length === 0}
          retry={data.reload}
        >
          <div className="game-grid">
            {data.data?.items.map((g) => <GameCard key={g.id} game={g} />)}
          </div>
          {data.data && (
            <Pager
              {...data.data.pagination}
              onChange={(p) => filters.set("page", String(p))}
            />
          )}
        </DataState>
      </main>
    </PageShell>
  );
}
export function GameDetail({ slug }: { slug: string }) {
  const { t } = useCopy();
  const game = useApi<Page<Game>>(
    `/games?slug=${encodeURIComponent(slug)}`,
    "public",
  );
  return (
    <PageShell>
      <main className="container page">
        <Link className="back-link" href="/games">
          ← {t("games")}
        </Link>
        <DataState
          {...game}
          empty={game.data?.items.length === 0}
          retry={game.reload}
        >
          {game.data?.items[0] && <GameDetailBody game={game.data.items[0]} />}
        </DataState>
      </main>
    </PageShell>
  );
}
function GameDetailBody({ game }: { game: Game }) {
  const config = useSite();
  const { t, c } = useCopy();
  return (
    <>
      <Heading
        title={game.name}
        eyebrow={
          config.entries.find((entry) => entry.id === game.entryId)?.name
        }
        description={c(game.description)}
      />
      {game.status !== "available" ? (
        <Roadmap title={game.name} stage="P2" />
      ) : (
        <div className="game-detail-grid">
          <div className="card game-stage">
            <GameArt kind={game.kind} large />
            <div className="game-stage-caption">
              <ModeBadge mode={game.mode} />
              <span>
                {config.chains.find((chain) => chain.id === game.chainId)
                  ?.name ?? game.chainId}{" "}
                · {game.assetId}
              </span>
            </div>
          </div>
          <div className="card card-pad">
            <RequireAuth>
              <CoinFlip game={game} />
            </RequireAuth>
          </div>
        </div>
      )}
      <section className="card rule-card">
        <h3>{t("rules")}</h3>
        <div className="grid grid-3">
          <p>
            <b>01</b>
            {t("gameRuleQuote")}
          </p>
          <p>
            <b>02</b>
            {t("gameRuleRandom")}
          </p>
          <p>
            <b>03</b>
            {t("gameRulePayout")}
          </p>
        </div>
      </section>
    </>
  );
}
function CoinFlip({ game }: { game: Game }) {
  const { t, line } = useCopy();
  const params = useSearchParams(),
    router = useRouter();
  const [choice, setChoice] = useState("heads"),
    [quote, setQuote] = useState<Quote>();
  const action = useAction();
  const now = useNow();
  const quoteValid = Boolean(
    quote && new Date(quote.expiresAt).getTime() > now,
  );
  const sessionId = params.get("session");
  const data = useApi<{ session: GameSession }>(
    `/game-sessions/${sessionId}`,
    "user",
    Boolean(sessionId),
    Boolean(sessionId),
    (value) => value.session.status === "playing",
  );
  async function getQuote() {
    const result = await action.run<{ quote: Quote }>(
      `/games/${game.id}/quotes`,
      { choice },
    );
    if (result) setQuote(result.quote);
  }
  async function play() {
    const result = await action.run<{ session: GameSession }>(
      `/games/${game.id}/sessions`,
      { quoteId: quote?.id },
    );
    if (result) {
      setQuote(undefined);
      router.replace(`/games/${game.slug}?session=${result.session.id}`, {
        scroll: false,
      });
    }
  }
  const session = data.data?.session;
  if (sessionId)
    return (
      <DataState {...data} retry={data.reload}>
        {session && (
          <div className="round-result">
            <div
              className={`result-coin ${session.status === "playing" ? "coin-spinning" : ""}`}
            >
              W
            </div>
            <Status value={session.status} />
            <h2>
              {session.status === "settled"
                ? t(session.won ? "won" : "lost")
                : t(session.status)}
            </h2>
            {session.status === "failed" && (
              <p className="muted">
                {line(
                  "本局未完成，参与费用已返还。可在资产流水中查看。",
                  "This round failed and your entry was refunded. Check your asset history.",
                  "ゲームは完了できず、参加費を返却しました。資産履歴をご確認ください。",
                  "게임이 완료되지 않아 참가 비용이 반환되었습니다. 자산 내역을 확인하세요.",
                )}
              </p>
            )}
            {session.status === "settled" && (
              <>
                <p>
                  {t("heads")} / {t("tails")}:{" "}
                  <strong>{t(session.outcome)}</strong>
                </p>
                <strong className="result-amount">
                  +{formatAtomic(session.payoutAtomic)} {session.assetId}
                </strong>
              </>
            )}
            <label>
              {t("roundId")}
              <input
                className="input mono"
                value={session.id}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </label>
            <p className="muted small">
              {line(
                "此编号可用于「开启你的第一局」任务。",
                "Use this ID for the “Your first round” quest.",
                "このIDを「最初のゲーム」クエストに使用。",
                "이 ID를 첫 게임 퀘스트에 사용하세요.",
              )}
            </p>
            {session.status !== "playing" && (
              <div className="stack">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    router.replace(`/games/${game.slug}`);
                    data.reload();
                  }}
                >
                  {t("newRound")}
                </button>
                <Link className="text-link" href="/quests/first-game">
                  {t("quests")} →
                </Link>
              </div>
            )}
          </div>
        )}
      </DataState>
    );
  return (
    <>
      <div className="row-between">
        <h2>{t("play")}</h2>
        <ModeBadge mode={game.mode} />
      </div>
      <p className="muted">
        {line(
          "选择你的一面",
          "Pick your side",
          "あなたの面を選択",
          "원하는 면을 선택하세요",
        )}
      </p>
      <div className="choice-grid">
        {["heads", "tails"].map((side) => (
          <button
            className={choice === side ? "selected" : ""}
            key={side}
            onClick={() => {
              setChoice(side);
              setQuote(undefined);
            }}
            aria-pressed={choice === side}
          >
            <span>{side === "heads" ? "W" : "✦"}</span>
            {t(side)}
          </button>
        ))}
      </div>
      <div className="quote-summary">
        <span>{t("cost")}</span>
        <strong>
          {formatAtomic(quote?.amountAtomic ?? game.costAtomic)} {game.assetId}
        </strong>
      </div>
      {quote && (
        <p className="muted small">
          {quoteValid
            ? `${t("end")}: ${new Date(quote.expiresAt).toLocaleTimeString()}`
            : line(
                "报价已过期，请重新获取。",
                "Quote expired. Request a new quote.",
                "見積もりの有効期限が切れました。再取得してください。",
                "견적이 만료되었습니다. 새 견적을 요청하세요.",
              )}
        </p>
      )}
      <button
        className="btn btn-primary full-width"
        disabled={action.busy}
        onClick={() => void (quoteValid ? play() : getQuote())}
      >
        {action.busy ? t("loading") : quoteValid ? t("confirm") : t("quote")}
        <Icon name="arrow" />
      </button>
      {action.error && (
        <p className="inline-error" role="alert">
          {action.error.message}
        </p>
      )}
      <p className="muted small">{t("preview")}</p>
    </>
  );
}
export function GameHistory() {
  const { t } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Heading title={t("history")} eyebrow="YOUR PLAY JOURNAL" />
        <RequireAuth>
          <HistoryBody />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function HistoryBody() {
  const config = useSite();
  const { t } = useCopy(),
    filters = useFilters();
  const data = useApi<CursorPage<GameSession>>(
    `/game-sessions/me?${filters.query}`,
  );
  return (
    <DataState
      {...data}
      empty={data.data?.items.length === 0}
      retry={data.reload}
    >
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("time")}</th>
              <th>{t("game")}</th>
              <th>{t("cost")}</th>
              <th>{t("reward")}</th>
              <th>{t("status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.data?.items.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>
                  {config.catalog.find((game) => game.id === s.gameId)?.name ??
                    s.gameId}{" "}
                  <ModeBadge mode={s.platformMode} />
                </td>
                <td>
                  {s.amountAtomic} {s.assetId}
                </td>
                <td>
                  {s.status === "settled"
                    ? `${s.payoutAtomic} ${s.assetId}`
                    : "—"}
                </td>
                <td>
                  <Status value={s.status} />
                </td>
                <td>
                  <Link
                    className="text-link"
                    href={`/games/${config.catalog.find((game) => game.id === s.gameId)?.slug ?? s.gameId}?session=${s.id}`}
                  >
                    {t("view")} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        {filters.params.get("cursor") && (
          <button
            className="btn btn-secondary"
            onClick={() => filters.set("cursor", "")}
          >
            {t("back")}
          </button>
        )}
        {data.data?.hasMore && (
          <button
            className="btn btn-secondary"
            onClick={() => filters.set("cursor", data.data!.nextCursor!)}
          >
            {t("next")}
          </button>
        )}
      </div>
    </DataState>
  );
}
