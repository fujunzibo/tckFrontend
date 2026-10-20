"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PageShell, RequireAuth } from "../components";
import { useCopy } from "../lib/copy";
import { useAction, useApi, useFilters, useNow } from "../lib/hooks";
import type { Page, Quest, Submission, Reward } from "../lib/contracts";
import { DataState, Heading, Icon, Pager, Status } from "../ui/primitives";
import { formatAtomic } from "../lib/amount";

export function Quests() {
  const { t, line, c } = useCopy(),
    filters = useFilters();
  const data = useApi<Page<Quest>>(`/quests?${filters.query}`);
  return (
    <PageShell>
      <main className="container page">
        <Heading
          title={t("quests")}
          eyebrow="SMALL STEPS. BIG POSSIBILITIES."
          description={line(
            "让每一次参与，都成为成长的一部分。",
            "Make every activity a step forward.",
            "毎回の参加を、成長の一歩に。",
            "모든 참여를 성장의 한 걸음으로.",
          )}
        />
        <div className="filter-bar">
          <div className="filter-tabs">
            {["", "daily", "game", "social"].map((type) => (
              <button
                key={type}
                className={
                  (filters.params.get("type") ?? "") === type ? "active" : ""
                }
                onClick={() => filters.set("type", type)}
              >
                {t(type || "all")}
              </button>
            ))}
          </div>
          <select
            aria-label={t("status")}
            value={filters.params.get("status") ?? ""}
            onChange={(e) => filters.set("status", e.target.value)}
          >
            <option value="">{t("all")}</option>
            {[
              "not_started",
              "pending_review",
              "completed",
              "reward_claimed",
              "rejected",
            ].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </div>
        <DataState
          {...data}
          empty={data.data?.items.length === 0}
          retry={data.reload}
        >
          <div className="quest-grid">
            {data.data?.items.map((q) => (
              <Link
                className="card wins-quest"
                href={`/quests/${q.id}`}
                key={q.id}
              >
                <div className="quest-top">
                  <span className={`quest-icon quest-${q.type}`}>
                    <Icon
                      name={
                        q.type === "game"
                          ? "games"
                          : q.type === "daily"
                            ? "clock"
                            : "profile"
                      }
                      size={26}
                    />
                  </span>
                  <span className="tiny-tag">{t(q.type)}</span>
                </div>
                <h3>{c(q.title)}</h3>
                <p>{c(q.description)}</p>
                <div className="quest-bottom">
                  <strong>
                    +{formatAtomic(q.rewardAmount)} <small>{t("points")}</small>
                  </strong>
                  <Status value={q.userStatus ?? "not_started"} />
                </div>
              </Link>
            ))}
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
export function QuestDetail({ id }: { id: string }) {
  const { t } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Link className="back-link" href="/quests">
          ← {t("quests")}
        </Link>
        <RequireAuth>
          <QuestBody id={id} />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function QuestBody({ id }: { id: string }) {
  const { t, c, line } = useCopy();
  const data = useApi<{ quest: Quest; record: Submission | null }>(
    `/quests/${id}`,
  );
  const action = useAction();
  const [proof, setProof] = useState("");
  const q = data.data?.quest,
    r = data.data?.record;
  async function submit(e: FormEvent) {
    e.preventDefault();
    await action.run(`/quests/${id}/submit`, { proof });
  }
  const now = useNow();
  const expired = q
    ? now > Date.parse(q.endTime) || now < Date.parse(q.startTime)
    : false;
  const canSubmit = !expired && (!r || r.status === "rejected");
  return (
    <DataState {...data} retry={data.reload}>
      {q && (
        <>
          <Heading
            title={c(q.title)}
            eyebrow={`${t(q.type)} / QUEST`}
            description={c(q.description)}
          />
          <div className="split">
            <section className="card card-pad">
              <div className="reward-amount">
                +{formatAtomic(q.rewardAmount)} <span>{t("points")}</span>
              </div>
              <div className="detail-pairs">
                <div>
                  <span>{t("start")}</span>
                  <b>{new Date(q.startTime).toLocaleDateString()}</b>
                </div>
                <div>
                  <span>{t("end")}</span>
                  <b>{new Date(q.endTime).toLocaleDateString()}</b>
                </div>
                <div>
                  <span>{t("type")}</span>
                  <b>{t(q.reviewMode)}</b>
                </div>
              </div>
              <h3>{t("rules")}</h3>
              <ol className="quest-steps">
                <li>
                  {line(
                    "完成任务描述中的要求。",
                    "Complete the requirements above.",
                    "上記の要件を完了してください。",
                    "위의 요구사항을 완료하세요.",
                  )}
                </li>
                <li>
                  {line(
                    "提交证明，等待自动验证或运营审核。",
                    "Submit proof for automatic validation or review.",
                    "証明を提出し、検証または審査を待つ。",
                    "증빙을 제출하고 검증 또는 검토를 기다리세요.",
                  )}
                </li>
                <li>
                  {line(
                    "审核通过后领取，积分与 IP 分开记录。",
                    "Claim after approval. Member points are separate from IP.",
                    "承認後に受取。会員ポイントとIPは別管理。",
                    "승인 후 수령하세요. 멤버 포인트와 IP는 별개입니다.",
                  )}
                </li>
              </ol>
            </section>
            <aside className="card card-pad">
              <Status value={r?.status ?? "not_started"} />
              {r?.rejectReason && (
                <div className="inline-error">
                  <strong>{t("reason")}</strong>
                  <p>{r.rejectReason}</p>
                </div>
              )}
              <form onSubmit={submit}>
                <label>
                  {t("proof")}
                  <textarea
                    className="textarea"
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    required={q.type !== "daily"}
                    minLength={q.type === "daily" ? 0 : 10}
                    maxLength={2000}
                    disabled={!canSubmit || action.busy}
                    placeholder={q.type === "game" ? t("roundId") : t("proof")}
                  />
                </label>
                <button
                  className="btn btn-primary full-width"
                  disabled={!canSubmit || action.busy}
                >
                  {action.busy ? t("loading") : t("submit")}
                </button>
              </form>
              <button
                className="btn btn-gold full-width"
                disabled={r?.status !== "completed" || action.busy}
                onClick={() => void action.run(`/quests/${id}/claim`)}
              >
                {t("claim")}
              </button>
              {expired && <p className="muted">{t("end")}</p>}
              {r && (
                <div className="submission-proof">
                  <h4>
                    {t("activity")} · v{r.version}
                  </h4>
                  <p className="mono">{r.proof}</p>
                  <small>{new Date(r.submittedAt).toLocaleString()}</small>
                  {r.history.map((h, i) => (
                    <details key={i}>
                      <summary>
                        v{i + 1} · {t("history")}
                      </summary>
                      <p>{h.proof}</p>
                      <p>{h.reason}</p>
                    </details>
                  ))}
                </div>
              )}
              {action.error && (
                <p className="inline-error" role="alert">
                  {action.error.message}
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </DataState>
  );
}
export function Rewards() {
  const { t, line } = useCopy();
  return (
    <PageShell>
      <main className="container page">
        <Heading
          title={t("rewards")}
          eyebrow="EARNED THROUGH EXPLORATION"
          description={line(
            "每一份奖励，都是你参与的回响。",
            "Every reward tells a story of participation.",
            "すべての報酬は参加の証。",
            "모든 보상은 참여의 증거입니다.",
          )}
        />
        <RequireAuth>
          <RewardsBody />
        </RequireAuth>
      </main>
    </PageShell>
  );
}
function RewardsBody() {
  const { t, c } = useCopy(),
    filters = useFilters();
  const data = useApi<Page<Reward>>(`/rewards/me?${filters.query}`);
  const action = useAction();
  return (
    <DataState
      {...data}
      empty={data.data?.items.length === 0}
      retry={data.reload}
    >
      <div className="quest-grid">
        {data.data?.items.map((r) => (
          <article className="card reward-card" key={r.id}>
            <div className="row-between">
              <span className="reward-icon">
                <Icon name="rewards" size={30} />
              </span>
              <Status value={r.status} />
            </div>
            <h3>{c(r.title)}</h3>
            <div className="reward-amount">
              +{formatAtomic(r.amountAtomic)} <span>{t("points")}</span>
            </div>
            <p className="muted small">
              {new Date(r.createdAt).toLocaleString()}
            </p>
            <button
              className="btn btn-gold full-width"
              disabled={r.status !== "eligible" || action.busy}
              onClick={() => void action.run(`/rewards/${r.id}/claim`)}
            >
              {t(r.status === "issued" ? "issued" : "claim")}
            </button>
          </article>
        ))}
      </div>
      {data.data && (
        <Pager
          {...data.data.pagination}
          onChange={(p) => filters.set("page", String(p))}
        />
      )}
    </DataState>
  );
}
