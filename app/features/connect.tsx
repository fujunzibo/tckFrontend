"use client";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell, Logo, Language } from "../components";
import { useAuth } from "../auth";
import { useWallet } from "../wallet";
import { useCopy } from "../lib/copy";
import { safeReturnPath } from "../lib/amount";
import { walletErrorText } from "../lib/wallet";
import { Icon, GameArt } from "../ui/primitives";
import { ModeBadge, useSite } from "../site";

function WalletForm() {
  const { t } = useCopy();
  const wallet = useWallet();
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connection = wallet.connection;
  const signedIn =
    !!connection &&
    auth.user?.walletAddress?.toLowerCase() ===
      connection.address.toLowerCase();
  async function run(action: () => Promise<void>) {
    if (busy || wallet.connecting) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(walletErrorText(error, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="wallet-form stack" data-wallet-form>
      {connection ? (
        <>
          <p className="accent" role="status">
            {t(signedIn ? "walletSignedIn" : "walletConnected")}
          </p>
          <dl className="wallet-details">
            <dt>
              {connection.wallet.id === "injected"
                ? t("walletBrowser")
                : connection.wallet.name}
            </dt>
            <dd>
              <span className="muted">{t("walletAddress")}</span>
              <code data-wallet-address>{connection.address}</code>
            </dd>
            <dt>{t("walletNetwork")}</dt>
            <dd data-wallet-chain>{BigInt(connection.chainId).toString()}</dd>
          </dl>
          {signedIn ? (
            <Link
              className="btn btn-primary full-width"
              href={safeReturnPath(params.get("returnTo"))}
            >
              {t("dashboard")}
            </Link>
          ) : (
            <button
              className="btn btn-primary full-width"
              disabled={busy || wallet.connecting}
              data-wallet-sign-in
              onClick={() =>
                void run(async () => {
                  await auth.walletLogin();
                  router.push(safeReturnPath(params.get("returnTo")));
                })
              }
            >
              {busy ? t("walletWaiting") : t("walletSignIn")}
            </button>
          )}
          <button
            className="btn btn-secondary full-width"
            data-wallet-disconnect
            onClick={() => {
              wallet.disconnect();
              setError("");
            }}
          >
            {t("walletDisconnect")}
          </button>
          <p className="muted">{t("walletChangeHint")}</p>
        </>
      ) : (
        <>
          {wallet.wallets.length ? (
            wallet.wallets.map((item) => (
              <button
                key={item.id}
                className="btn btn-secondary full-width"
                data-wallet-provider={item.id}
                disabled={busy || wallet.connecting}
                onClick={() => void run(() => wallet.connect(item))}
              >
                {wallet.connecting
                  ? t("walletWaiting")
                  : item.id === "injected"
                    ? t("walletBrowser")
                    : item.name}
                <Icon name="arrow" size={16} />
              </button>
            ))
          ) : (
            <p className="muted" data-wallet-missing>
              {t("walletMissing")}
            </p>
          )}
        </>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="risk-note">{t("walletSignatureNote")}</p>
    </div>
  );
}

function CredentialsForm({ admin = false }: { admin?: boolean }) {
  const { t, line } = useCopy();
  const auth = useAuth();
  const wallet = useWallet();
  const router = useRouter();
  const params = useSearchParams();
  const [nickname, setNickname] = useState("Explorer"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [fresh, setFresh] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (admin) await auth.adminLogin(username, password);
      else {
        wallet.disconnect();
        await auth.login(nickname, fresh);
      }
      router.push(admin ? "/admin" : safeReturnPath(params.get("returnTo")));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} data-auth-mode={admin ? "admin" : "demo"}>
      <p className="muted">
        {admin ? t("adminLoginDescription") : t("loginDescription")}
      </p>
      {admin && (
        <label>
          {line("用户名", "Username", "ユーザー名", "사용자 이름")}
          <input
            className="input"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
      )}
      <label>
        {admin ? t("password") : t("nickname")}
        <input
          className="input"
          required
          type={admin ? "password" : "text"}
          value={admin ? password : nickname}
          onChange={(e) =>
            admin ? setPassword(e.target.value) : setNickname(e.target.value)
          }
          minLength={admin ? 1 : 2}
          maxLength={admin ? 200 : 32}
          autoComplete={admin ? "current-password" : "nickname"}
        />
      </label>
      {!admin && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={fresh}
            onChange={(e) => setFresh(e.target.checked)}
          />
          {t("newIdentity")}
        </label>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary full-width" disabled={busy}>
        {busy ? t("loading") : t(admin ? "adminSignIn" : "login")}
        <Icon name="arrow" />
      </button>
    </form>
  );
}

export default function Connect({ admin = false }: { admin?: boolean }) {
  const { t, line } = useCopy();
  const config = useSite();
  const form = (
    <div className="connect-grid container">
      <section className="connect-intro">
        <div className="eyebrow">YOUR NEXT CHAPTER</div>
        <h1>
          {admin
            ? t("admin")
            : line(
                "准备好开始了吗？",
                "Ready for your next move?",
                "次の一歩を踏み出そう。",
                "다음 모험을 시작할까요?",
              )}
        </h1>
        <p>{t(admin ? "adminLoginDescription" : "walletDescription")}</p>
        <GameArt kind="coin_flip" large />
      </section>
      <section className="card connect-card">
        <div className="connect-icon">
          <Icon name={admin ? "quests" : "spark"} size={32} />
        </div>
        {admin && <ModeBadge />}
        <h2>{t(admin ? "admin" : "connectWallet")}</h2>
        {admin ? (
          <CredentialsForm admin />
        ) : (
          <>
            <WalletForm />
            {config.features.demoLogin && (
              <details className="demo-login">
                <summary>{t("demoEntry")}</summary>
                <CredentialsForm />
              </details>
            )}
          </>
        )}
        <Link className="text-link" href={admin ? "/connect" : "/admin/login"}>
          {t(admin ? "connectWallet" : "admin")} ↗
        </Link>
      </section>
    </div>
  );
  return admin ? (
    <main className="admin-login">
      <header className="container row-between">
        <Logo />
        <Language />
      </header>
      {form}
    </main>
  ) : (
    <PageShell>
      <main className="page">{form}</main>
    </PageShell>
  );
}
