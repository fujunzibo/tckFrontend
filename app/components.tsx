"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { localeOptions, useI18n } from "./i18n";
import { useCopy } from "./lib/copy";
import { Icon, DataState } from "./ui/primitives";
import { ModeBadge } from "./site";
import { useWallet } from "./wallet";
import { shortAddress } from "./lib/wallet";

export const userNav = [
  { key: "games", href: "/games" },
  { key: "fighters", href: "/fighters" },
  { key: "quests", href: "/quests" },
  { key: "rewards", href: "/rewards" },
];
export const extraNav = [
  { key: "dashboard", href: "/dashboard" },
  { key: "tickets", href: "/tickets" },
  { key: "invite", href: "/invite" },
  { key: "leaderboard", href: "/leaderboard" },
  { key: "membership", href: "/membership" },
  { key: "history", href: "/games/history" },
  { key: "tournaments", href: "/tournaments" },
  { key: "profile", href: "/profile" },
];
export const adminNav = [
  { key: "dashboard", href: "/admin" },
  { key: "users", href: "/admin/users" },
  { key: "games", href: "/admin/games" },
  { key: "history", href: "/admin/game-sessions" },
  { key: "fighters", href: "/admin/fighters" },
  { key: "fight", href: "/admin/fights" },
  { key: "quests", href: "/admin/quests" },
  { key: "reviews", href: "/admin/quest-reviews" },
  { key: "points", href: "/admin/points" },
  { key: "rewards", href: "/admin/rewards" },
  { key: "invite", href: "/admin/invitations" },
  { key: "leaderboard", href: "/admin/leaderboards" },
  { key: "orders", href: "/admin/orders" },
  { key: "settlements", href: "/admin/settlements" },
  { key: "tournaments", href: "/admin/tournaments" },
  { key: "imports", href: "/admin/import-batches" },
  { key: "identities", href: "/admin/legacy-identities" },
  { key: "noova", href: "/admin/noova" },
  { key: "settings", href: "/admin/settings" },
  { key: "audit", href: "/admin/audit-logs" },
];
export function Logo() {
  return (
    <Link href="/" className="wins-logo" aria-label="TCK Wins home">
      <span className="wins-mark">W</span>
      <span>
        TCK<span className="logo-light">WINS</span>
        <small>PLAY. GROW. BELONG.</small>
      </span>
    </Link>
  );
}
export function Language() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      className="language-select"
      aria-label="Language"
      value={locale}
      onChange={(e) => setLocale(e.target.value as typeof locale)}
    >
      {localeOptions.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
export function PageShell({ children }: { children: ReactNode }) {
  const { t } = useCopy();
  const { user, logout } = useAuth();
  const wallet = useWallet();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && /^[A-Za-z0-9-]{1,64}$/.test(ref))
      sessionStorage.setItem("wins:ref", ref);
  }, []);
  const active = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="wins-nav">
        <div className="container nav-inner">
          <Logo />
          <nav className="wins-nav-links" aria-label="Main">
            {userNav.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                className={active(n.href) ? "active" : ""}
              >
                {t(n.key)}
              </Link>
            ))}
            <details className="nav-more">
              <summary>{t("more")}</summary>
              <div>
                {extraNav.map((n) => (
                  <Link key={n.key} href={n.href}>
                    {t(n.key)}
                  </Link>
                ))}
                <Link href="/admin">{t("admin")}</Link>
              </div>
            </details>
          </nav>
          <div className="nav-actions">
            <Language />
            <Link
              className="icon-button"
              href="/notifications"
              aria-label={t("notifications")}
            >
              <Icon name="notifications" />
            </Link>
            {user || wallet.connection ? (
              <details className="nav-more">
                <summary className="user-chip">
                  <span>{user?.nickname?.slice(0, 1) ?? "W"}</span>
                  {wallet.connection
                    ? shortAddress(wallet.connection.address)
                    : user?.walletAddress
                      ? shortAddress(user.walletAddress)
                      : user?.nickname}
                </summary>
                <div>
                  <Link href="/dashboard">{t("dashboard")}</Link>
                  <Link href="/profile">{t("profile")}</Link>
                  <Link href="/connect">
                    {t(wallet.connection ? "walletManage" : "connectWallet")}
                  </Link>
                  {wallet.connection && (
                    <button onClick={wallet.disconnect}>
                      {t("walletDisconnect")}
                    </button>
                  )}
                  {user && (
                    <button
                      onClick={() => void logout().catch(() => undefined)}
                    >
                      {t("logout")}
                    </button>
                  )}
                </div>
              </details>
            ) : (
              <Link className="btn btn-primary nav-login" href="/connect">
                {t("connectWallet")}
                <Icon name="arrow" size={16} />
              </Link>
            )}
            <button
              className="icon-button mobile-toggle"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={t("more")}
            >
              ☰
            </button>
          </div>
        </div>
        {open && (
          <nav className="wins-mobile-menu">
            {[...userNav, ...extraNav, { key: "admin", href: "/admin" }].map(
              (n) => (
                <Link key={n.key} href={n.href} onClick={() => setOpen(false)}>
                  {t(n.key)}
                </Link>
              ),
            )}
          </nav>
        )}
      </header>
      <div className="environment-strip">
        <span className="pulse-dot" />
        <ModeBadge />
        <span className="strip-divider">/</span>
        {t("preview")}
      </div>
      <div id="main-content">{children}</div>
      <footer className="wins-footer container">
        <Logo />
        <p>{t("preview")} · tck666.cc</p>
        <Link href="/admin">{t("admin")} ↗</Link>
      </footer>
      <nav className="wins-bottom-tabs">
        {[
          { key: "home", href: "/" },
          { key: "games", href: "/games" },
          { key: "quests", href: "/quests" },
          { key: "notifications", href: "/notifications" },
          { key: "profile", href: "/profile" },
        ].map((n) => (
          <Link
            href={n.href}
            className={active(n.href) ? "active" : ""}
            key={n.key}
          >
            <Icon name={n.key} size={19} />
            <span>{t(n.key)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const auth = useAuth();
  const { t } = useCopy();
  const pathname = usePathname();
  if (auth.loading) return <DataState loading />;
  if (admin ? !auth.admin : !auth.user)
    return (
      <div className="card state-panel auth-prompt">
        <Icon name={admin ? "quests" : "profile"} size={40} />
        <h2>{admin ? t("admin") : t("signInFirst")}</h2>
        <p>{t(admin ? "adminLoginDescription" : "walletDescription")}</p>
        <Link
          className="btn btn-primary"
          href={
            admin
              ? "/admin/login"
              : `/connect?returnTo=${encodeURIComponent(pathname)}`
          }
        >
          {t(admin ? "adminSignIn" : "connectWallet")}
          <Icon name="arrow" />
        </Link>
      </div>
    );
  return <>{children}</>;
}
export function AdminShell({ children }: { children: ReactNode }) {
  const { t } = useCopy();
  const { admin, logout } = useAuth();
  const pathname = usePathname();
  return (
    <div className="wins-admin">
      <aside>
        <Logo />
        <div className="admin-label">{t("admin")}</div>
        <nav>
          {adminNav.map((n) => (
            <Link
              className={pathname === n.href ? "active" : ""}
              key={n.href}
              href={n.href}
            >
              <Icon name={n.key} size={17} />
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <Link className="admin-back" href="/">
          ← {t("home")}
        </Link>
      </aside>
      <div className="admin-content">
        <header>
          <ModeBadge />
          <div className="nav-actions">
            <Language />
            {admin && (
              <button
                className="btn btn-secondary"
                onClick={() => void logout("admin").catch(() => undefined)}
              >
                {t("logout")}
              </button>
            )}
          </div>
        </header>
        <main>
          <RequireAuth admin>{children}</RequireAuth>
        </main>
      </div>
    </div>
  );
}
