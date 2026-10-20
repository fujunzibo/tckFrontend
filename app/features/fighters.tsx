"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell, RequireAuth } from "../components";
import { useCopy } from "../lib/copy";
import { useSite } from "../site";
import { formatAtomic } from "../lib/amount";
import { useAction, useApi } from "../lib/hooks";
import type { CursorPage, Fight, Fighter } from "../lib/contracts";
import {
  DataState,
  FighterArt,
  FighterCard,
  Heading,
  Icon,
  Status,
} from "../ui/primitives";

export function Fighters() {
  const { t, line } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Heading
          eyebrow="YOUR AI. YOUR IDENTITY."
          title={t("fighters")}
          description={line(
            "为你的下一场胜利，创造独一无二的角色。",
            "Create a fighter that is uniquely yours.",
            "あなただけのファイターを作ろう。",
            "나만의 특별한 파이터를 만들어보세요.",
          )}
        />
        <RequireAuth>
          <FightersBody />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function FightersBody() {
  const config = useSite();
  const { t } = useCopy(),
    router = useRouter();
  const data = useApi<{ items: Fighter[]; limit: number }>(
    "/fighters/me",
    "user",
    true,
    true,
    (value) => value.items.some((f) => f.status === "generating"),
  );
  const action = useAction();
  const [name, setName] = useState(""),
    [style, setStyle] = useState("striker"),
    [failure, setFailure] = useState(false),
    [show, setShow] = useState(false);
  async function create(e: FormEvent) {
    e.preventDefault();
    const result = await action.run<{ fighter: Fighter }>("/fighters", {
      name,
      style,
      simulateFailure: config.features.fighterFailureSimulation && failure,
    });
    if (result) router.push(`/fighters/${result.fighter.id}`);
  }
  return (
    <>
      <div className="fighter-toolbar">
        <span className="muted">
          {data.data?.items.filter((f) => f.status !== "failed").length ?? 0} /{" "}
          {data.data?.limit ?? "—"} {t("fighters")} · {t("fighterCost")}
        </span>
        <button className="btn btn-primary" onClick={() => setShow(!show)}>
          <Icon name="spark" />
          {t("createFighter")}
        </button>
      </div>
      {show && (
        <form className="card fighter-create" onSubmit={create}>
          <div>
            <h3>{t("createFighter")}</h3>
            <label>
              {t("name")}
              <input
                className="input"
                minLength={2}
                maxLength={24}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NOVA-01"
              />
            </label>
            <div className="style-choices">
              {["striker", "guardian", "tactician"].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStyle(s)}
                  className={style === s ? "selected" : ""}
                >
                  {t(s)}
                </button>
              ))}
            </div>
            {config.features.fighterFailureSimulation && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={failure}
                  onChange={(e) => setFailure(e.target.checked)}
                />
                {t("fighterFailure")}
              </label>
            )}
            <button className="btn btn-primary" disabled={action.busy}>
              {action.busy ? t("loading") : t("create")} ·{" "}
              {formatAtomic(config.fighterCreation.amountAtomic)}{" "}
              {config.fighterCreation.assetId}
            </button>
            {action.error && (
              <p role="alert" className="inline-error">
                {action.error.message}
              </p>
            )}
          </div>
          <FighterArt style={style} />
        </form>
      )}
      <DataState
        {...data}
        empty={data.data?.items.length === 0}
        retry={data.reload}
      >
        <div className="fighter-grid">
          {data.data?.items.map((f) => <FighterCard key={f.id} fighter={f} />)}
        </div>
      </DataState>
      <div className="risk-note">{t("fighterNotice")}</div>
    </>
  );
}
export function FighterDetail({ id }: { id: string }) {
  const { t } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Link className="back-link" href="/fighters">
          ← {t("fighters")}
        </Link>
        <RequireAuth>
          <FighterBody id={id} />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function FighterBody({ id }: { id: string }) {
  const { t, line } = useCopy(),
    router = useRouter();
  const data = useApi<{ fighter: Fighter }>(
    `/fighters/${id}`,
    "user",
    true,
    true,
    (value) => value.fighter.status === "generating",
  );
  const fights = useApi<CursorPage<Fight>>("/fights/me");
  const action = useAction();
  async function match() {
    const result = await action.run<{ fight: Fight }>("/fights/queue", {
      fighterId: id,
    });
    if (result) router.push(`/fights/${result.fight.id}`);
  }
  const f = data.data?.fighter;
  return (
    <DataState {...data} retry={data.reload}>
      {f && (
        <>
          <Heading title={f.name} eyebrow={t("environment")} />
          <div className="fighter-detail">
            <div className="card fighter-display">
              <FighterArt style={f.style} size="large" />
            </div>
            <div className="card card-pad">
              <Status value={f.status} />
              <h2>{t(f.style)}</h2>
              <p className="muted">
                {line(
                  "每个角色，都有自己的战斗风格。",
                  "Every fighter has a style of their own.",
                  "ファイターにはそれぞれの戦い方がある。",
                  "모든 파이터는 자신만의 전투 스타일이 있습니다.",
                )}
              </p>
              {(["power", "speed", "defense"] as const).map((k) => (
                <div className="attribute" key={k}>
                  <div>
                    <span>{t(k)}</span>
                    <strong>{f[k]}</strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${f[k]}%` }} />
                  </div>
                </div>
              ))}
              {f.status === "ready" && (
                <button
                  className="btn btn-primary full-width"
                  disabled={action.busy}
                  onClick={() => void match()}
                >
                  {t("fight")} <Icon name="arrow" />
                </button>
              )}
              {f.status === "generating" && (
                <p className="muted" role="status">
                  {t("generating")}…
                </p>
              )}
              {f.status === "failed" && (
                <>
                  <p className="inline-error">{t("failedRefund")}</p>
                  <button
                    className="btn btn-secondary"
                    disabled={action.busy}
                    onClick={() => void action.run(`/fighters/${id}/retry`)}
                  >
                    {t("retry")} · 1 TICKET
                  </button>
                </>
              )}
              {action.error && (
                <p className="inline-error" role="alert">
                  {action.error.message}
                </p>
              )}
            </div>
          </div>
          <section className="wins-section">
            <h2>{t("activity")}</h2>
            <div className="stack">
              {fights.data?.items
                .filter((x) => x.fighterId === id)
                .map((x) => (
                  <Link
                    className="card record-row"
                    href={`/fights/${x.id}`}
                    key={x.id}
                  >
                    <span>VS {x.opponent}</span>
                    <Status value={x.status} />
                    <Icon name="arrow" />
                  </Link>
                ))}
            </div>
          </section>
        </>
      )}
    </DataState>
  );
}
export function FightDetail({ id }: { id: string }) {
  return (
    <PageShell>
      <main className="container page">
        <RequireAuth>
          <FightBody id={id} />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function FightBody({ id }: { id: string }) {
  const { t, line } = useCopy();
  const data = useApi<{ fight: Fight }>(
    `/fights/${id}`,
    "user",
    true,
    true,
    (value) => ["queued", "live"].includes(value.fight.status),
  );
  const fighters = useApi<{ items: Fighter[] }>("/fighters/me");
  const f = data.data?.fight;
  const fighter = fighters.data?.items.find((x) => x.id === f?.fighterId);
  return (
    <DataState {...data} retry={data.reload}>
      {f && (
        <>
          <Heading
            title={line(
              "AI 对战竞技场",
              "AI battle arena",
              "AIバトルアリーナ",
              "AI 대전 아레나",
            )}
            eyebrow={t("environment")}
            action={<Status value={f.status} />}
          />
          <div
            className={`arena-stage ${f.status === "live" ? "arena-live" : ""}`}
          >
            <div>
              <FighterArt style={fighter?.style} />
              <h2>{fighter?.name ?? "—"}</h2>
              <span className="tiny-tag">YOUR FIGHTER</span>
            </div>
            <div className="versus">
              <span>VS</span>
              <p>{t(f.status)}</p>
            </div>
            <div>
              <FighterArt style="guardian" />
              <h2>{f.opponent}</h2>
              <span className="tiny-tag">{t("opponentLabel")}</span>
            </div>
          </div>
          <div className="match-timeline">
            {["queued", "live", "settled"].map((s, i) => (
              <div
                className={
                  ["queued", "live", "settled"].indexOf(f.status) >= i
                    ? "active"
                    : ""
                }
                key={s}
              >
                <span>{i + 1}</span>
                {t(s)}
              </div>
            ))}
          </div>
          <div className="card match-result">
            {f.status === "settled" ? (
              <>
                <span className="eyebrow">MATCH COMPLETE</span>
                <h2>{t(f.won ? "won" : "lost")}</h2>
                <p>
                  +{formatAtomic(f.payoutAtomic)} {f.assetId} · {t("preview")}
                </p>
                <Link
                  className="btn btn-primary"
                  href={`/fighters/${f.fighterId}`}
                >
                  {t("back")}
                  <Icon name="arrow" />
                </Link>
              </>
            ) : f.status === "failed" ? (
              <>
                <h2>{t("failed")}</h2>
                <Link
                  className="btn btn-secondary"
                  href={`/fighters/${f.fighterId}`}
                >
                  {t("back")}
                </Link>
              </>
            ) : (
              <p>{t("fightProgress")}</p>
            )}
          </div>
        </>
      )}
    </DataState>
  );
}
