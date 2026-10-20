"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useApi } from "./lib/hooks";
import type { Config } from "./lib/contracts";
import { useI18n } from "./i18n";

const SiteContext = createContext<Config | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { data, error, reload } = useApi<Config>("/public/config", "public");
  if (!data)
    return (
      <main className="container page" role={error ? "alert" : "status"}>
        <p>{error ? error.message : "Loading…"}</p>
        {error && (
          <button className="btn btn-primary" onClick={reload}>
            重试 / Retry
          </button>
        )}
      </main>
    );
  return <SiteContext.Provider value={data}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext)!;
}

export function ModeBadge({ mode }: { mode?: string }) {
  const config = useSite();
  const { locale } = useI18n();
  const label = config.modes.find(
    (item) => item.id === (mode ?? config.platformMode),
  )?.label;
  return label ? <span className="tiny-tag">{label[locale]}</span> : null;
}
