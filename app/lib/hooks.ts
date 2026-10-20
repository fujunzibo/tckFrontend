"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getToken, refreshData, request } from "./api-client";
import type { Domain } from "./contracts";
import { useToast } from "../toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useFilters() {
  const params = useSearchParams(),
    router = useRouter(),
    pathname = usePathname();
  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page" && key !== "cursor") {
      next.delete("page");
      next.delete("cursor");
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  }
  return { params, set, query: params.toString() };
}

const cache = new Map<string, { value: unknown; at: number }>();
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function useApi<T>(
  path: string,
  domain: Domain = "user",
  enabled = true,
  poll = false,
  pollUntil?: (data: T) => boolean,
) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    path?: string;
    data?: T;
    error?: Error;
    loading: boolean;
  }>({ loading: true });
  const pollTest = useRef(pollUntil);
  useEffect(() => {
    pollTest.current = pollUntil;
  }, [pollUntil]);
  const reload = useCallback(() => {
    cache.clear();
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => {
    const changed = () => {
      if (domain === "public") return;
      cache.clear();
      setState({ loading: true });
      setVersion((v) => v + 1);
    };
    window.addEventListener("wins:refresh", reload);
    window.addEventListener("wins:auth", changed);
    return () => {
      window.removeEventListener("wins:refresh", reload);
      window.removeEventListener("wins:auth", changed);
    };
  }, [reload, domain]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    const key = `${domain}:${getToken(domain)}:${path}`;
    const run = async () => {
      let keepPolling = poll;
      try {
        const hit = cache.get(key);
        const value =
          hit && Date.now() - hit.at < 1500
            ? (hit.value as T)
            : await request<T>(path, { domain, signal: controller.signal });
        if (controller.signal.aborted) return;
        cache.set(key, { value, at: Date.now() });
        setState({ path, data: value, loading: false });
        errors = 0;
        if (pollTest.current) keepPolling = pollTest.current(value);
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ path, error: error as Error, loading: false });
          errors++;
        }
      }
      if (poll && keepPolling && !controller.signal.aborted && errors < 5)
        timer = setTimeout(
          run,
          document.hidden ? 12000 : 2500 * Math.max(1, errors),
        );
    };
    void run();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [path, domain, enabled, poll, version]);
  return state.path === path
    ? { ...state, reload }
    : { loading: true, data: undefined, error: undefined, reload };
}
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error>();
  const pending = useRef(false);
  const keys = useRef(new Map<string, string>());
  const { showToast } = useToast();
  async function run<T>(
    path: string,
    body: unknown = {},
    domain: Domain = "user",
    method = "POST",
  ): Promise<T | undefined> {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    const action = `${domain}:${getToken(domain)}:${method}:${path}:${JSON.stringify(body)}`;
    const key = keys.current.get(action) ?? crypto.randomUUID();
    keys.current.set(action, key);
    try {
      const data = await request<T>(path, { domain, method, body, key });
      keys.current.delete(action);
      refreshData();
      return data;
    } catch (e) {
      const err = e as Error;
      setError(err);
      showToast(
        err instanceof ApiError ? `${err.code}: ${err.message}` : err.message,
        "error",
      );
      // Keep the key when the result is unknown; a retry must not create a second operation.
      if (err instanceof ApiError && err.status > 0 && err.status < 500)
        keys.current.delete(action);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { run, busy, error };
}
