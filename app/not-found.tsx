"use client";
import Link from "next/link";
import { PageShell } from "./components";
import { useCopy } from "./lib/copy";
export default function NotFound() {
  const { t } = useCopy();
  return (
    <PageShell>
      <main className="container state-panel">
        <div className="eyebrow">404</div>
        <h1>{t("empty")}</h1>
        <Link className="btn btn-primary" href="/">
          {t("home")}
        </Link>
      </main>
    </PageShell>
  );
}
