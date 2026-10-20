"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCopy } from "../lib/copy";
import { formatAtomic } from "../lib/amount";
import type { Asset, Fighter, Game } from "../lib/contracts";
import { ModeBadge, useSite } from "../site";

export function Icon({
  name = "spark",
  size = 20,
}: {
  name?: string;
  size?: number;
}) {
  const paths: Record<string, ReactNode> = {
    games: (
      <>
        <path d="M6 7h12l3 10-3 2-4-4h-4l-4 4-3-2Z" />
        <path d="M7 10v4m-2-2h4m7-1h.01m2 2h.01" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    fighters: (
      <>
        <path d="m12 3 8 4-2 11-6 3-6-3L4 7Z" />
        <path d="m8 10 2 1m6-1-2 1m-4 5h4" />
      </>
    ),
    quests: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 3h6v4H9Zm0 9 2 2 4-4m-6 8h6" />
      </>
    ),
    rewards: (
      <>
        <path d="M4 10h16v10H4Zm-1-4h18v4H3Zm9 0v14" />
        <path d="M12 6S5 6 6 3s6 3 6 3Zm0 0s7 0 6-3-6 3-6 3Z" />
      </>
    ),
    notifications: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 8h8m-4 0v8" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.spark}
    </svg>
  );
}
export function Heading({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="wins-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  const { t } = useCopy();
  return (
    <span className={`status-pill status-${value}`}>
      <span />
      {t(value)}
    </span>
  );
}
export function DataState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading?: boolean;
  error?: Error;
  empty?: boolean;
  retry?: () => void;
  children?: ReactNode;
}) {
  const { t } = useCopy();
  if (error)
    return (
      <div className="card state-panel" role="alert">
        <Icon name="spark" size={32} />
        <h3>{t("error")}</h3>
        <p>{error.message}</p>
        {retry && (
          <button className="btn btn-secondary" onClick={retry}>
            {t("retry")}
          </button>
        )}
      </div>
    );
  if (loading)
    return (
      <div className="skeleton-grid" role="status" aria-label={t("loading")}>
        {[1, 2, 3].map((n) => (
          <div className="skeleton" key={n} />
        ))}
      </div>
    );
  if (empty)
    return (
      <div className="card state-panel">
        <Icon size={36} />
        <h3>{t("empty")}</h3>
        <p>{t("emptyDesc")}</p>
      </div>
    );
  return <>{children}</>;
}
export function Stats({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    note?: string;
    icon?: string;
  }[];
}) {
  return (
    <div className="wins-stats">
      {items.map((item) => (
        <div className="card wins-stat" key={item.label}>
          <div>
            <span className="muted">{item.label}</span>
            <Icon name={item.icon} />
          </div>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}
export function AssetCards({ assets }: { assets: Asset[] }) {
  const { t } = useCopy();
  return (
    <div className="wins-stats">
      {assets.map((asset) => (
        <article className="card asset-card" key={asset.assetId}>
          <div className="asset-label">
            <span className={`asset-symbol asset-${asset.symbol}`}>
              <Icon name={asset.symbol === "TICKET" ? "rewards" : "coin"} />
            </span>
            <strong>
              {asset.symbol === "POINTS" ? t("points") : asset.symbol}
            </strong>
            <ModeBadge />
          </div>
          <strong className="asset-number">
            {formatAtomic(asset.availableAtomic, asset.decimals)}
          </strong>
          <div className="muted small">
            {t("available")}{" "}
            <span className="asset-locked">
              {t("locked")} {formatAtomic(asset.lockedAtomic, asset.decimals)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
export function GameArt({
  kind,
  color = "violet",
  large = false,
}: {
  kind: string;
  color?: string;
  large?: boolean;
}) {
  return (
    <div
      className={`game-art art-${color} ${large ? "art-large" : ""}`}
      aria-hidden="true"
    >
      <div className="art-grid" />
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      {kind === "coin_flip" ? (
        <div className="art-coin">
          <span>W</span>
        </div>
      ) : kind === "claw_machine" ? (
        <div className="art-claw">
          <div />
          <span>✧</span>
        </div>
      ) : kind === "cash_or_crash" ? (
        <svg className="art-chart" viewBox="0 0 240 140">
          <path
            d="M15 120 55 100 82 110 120 68 153 80 205 15"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
          />
          <path
            d="m174 15 31 0 0 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
          />
        </svg>
      ) : (
        <div className="art-cubes">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <i key={n} />
          ))}
        </div>
      )}
      <span className="art-star star-one">✦</span>
      <span className="art-star star-two">+</span>
    </div>
  );
}
export function GameCard({ game }: { game: Game }) {
  const { t, c } = useCopy();
  const config = useSite();
  return (
    <Link className="card game-card" href={`/games/${game.slug}`}>
      <div className="game-cover">
        <GameArt kind={game.kind} color={game.color} />
        <span className="cover-label">
          {config.entries.find((entry) => entry.id === game.entryId)?.name}
        </span>
      </div>
      <div className="game-info">
        <div className="row-between">
          <h3>{game.name}</h3>
          <Icon name="arrow" />
        </div>
        <p>{c(game.description)}</p>
        <div className="game-meta">
          <span className="tiny-tag">
            {config.chains.find((chain) => chain.id === game.chainId)?.name ??
              game.chainId}
          </span>
          <ModeBadge mode={game.mode} />
          <span className={game.status === "available" ? "accent" : "muted"}>
            {game.status === "available"
              ? `${formatAtomic(game.costAtomic)} ${game.assetId}`
              : t("soon")}
          </span>
        </div>
      </div>
    </Link>
  );
}
export function FighterArt({
  style = "striker",
  size = "normal",
}: {
  style?: string;
  size?: string;
}) {
  return (
    <div
      className={`fighter-art fighter-${style} fighter-${size}`}
      aria-hidden="true"
    >
      <div className="fighter-aura" />
      <svg viewBox="0 0 240 260">
        <defs>
          <linearGradient id={`metal-${style}`} x1="0" x2="1">
            <stop stopColor="#242747" />
            <stop offset=".5" stopColor="#7779b4" />
            <stop offset="1" stopColor="#202641" />
          </linearGradient>
        </defs>
        <path
          d="m58 251 13-65 23-23h52l23 23 13 65Z"
          fill={`url(#metal-${style})`}
          stroke="currentColor"
        />
        <path
          d="m77 45 43-22 43 22 9 57-19 51-33 16-33-16-19-51Z"
          fill={`url(#metal-${style})`}
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="m79 76 29 10-6 12-23-10Zm82 0-29 10 6 12 23-10Z"
          fill="currentColor"
        />
        <path
          d="m104 120 16 10 16-10-7 25h-18Z"
          fill="#15152c"
          stroke="currentColor"
        />
        <path
          d="m87 175 33 34 33-34m-47 48h28m-11-199v40"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="m75 178-29 9-21 63h40m100-72 29 9 21 63h-40"
          fill="#242645"
          stroke="currentColor"
        />
      </svg>
      <span className="fighter-orbit" />
    </div>
  );
}
export function FighterCard({ fighter }: { fighter: Fighter }) {
  const { t } = useCopy();
  return (
    <Link className="card fighter-card" href={`/fighters/${fighter.id}`}>
      <FighterArt style={fighter.style} />
      <div className="game-info">
        <div className="row-between">
          <h3>{fighter.name}</h3>
          <Status value={fighter.status} />
        </div>
        <p>
          {t(fighter.style)} <ModeBadge mode={fighter.platformMode} />
        </p>
        <div className="fighter-mini-stats">
          <span>
            {t("power")} <b>{fighter.power}</b>
          </span>
          <span>
            {t("speed")} <b>{fighter.speed}</b>
          </span>
          <span>
            {t("defense")} <b>{fighter.defense}</b>
          </span>
        </div>
      </div>
    </Link>
  );
}
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const { t } = useCopy();
  return (
    <div className="pagination">
      <button
        className="btn btn-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t("previous")}
      </button>
      <span>
        {page} / {totalPages}
      </span>
      <button
        className="btn btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        {t("next")}
      </button>
    </div>
  );
}
export function Roadmap({
  title,
  stage = "P1",
}: {
  title: string;
  stage?: string;
}) {
  const { t } = useCopy();
  return (
    <article className="card roadmap">
      <div className="roadmap-icon">
        <Icon size={48} />
      </div>
      <span className="eyebrow">{stage} · NEXT CHAPTER</span>
      <h2>{title}</h2>
      <p>{t("unavailableDescription")}</p>
      <Link className="btn btn-secondary" href="/games">
        {t("explore")} <Icon name="arrow" />
      </Link>
    </article>
  );
}
