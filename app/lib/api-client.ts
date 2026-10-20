"use client";
import type { Domain } from "./contracts";
import { errorMessage } from "./error-copy";

const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  "",
);
const prefix = `wins:${base}:`;
export const tokenKey = (domain: Domain) => `${prefix}${domain}-token`;
export const resumeKey = `${prefix}demo-identity`;
export function getToken(domain: Domain) {
  return typeof window === "undefined" || domain === "public"
    ? ""
    : localStorage.getItem(tokenKey(domain)) ?? "";
}
export function setToken(domain: Domain, token: string) {
  localStorage.setItem(tokenKey(domain), token);
  window.dispatchEvent(new CustomEvent("wins:auth", { detail: domain }));
}
export function clearToken(domain: Domain) {
  localStorage.removeItem(tokenKey(domain));
  window.dispatchEvent(new CustomEvent("wins:auth", { detail: domain }));
}
export function refreshData() {
  window.dispatchEvent(new Event("wins:refresh"));
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(
      errorMessage(
        code,
        message,
        typeof window === "undefined"
          ? "zh"
          : localStorage.getItem("wins-locale") ?? "zh",
      ),
    );
  }
}
export async function request<T>(
  path: string,
  options: {
    domain?: Domain;
    method?: string;
    body?: unknown;
    key?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const domain = options.domain ?? "user";
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(
    () => controller.abort(new Error("Request timed out")),
    15000,
  );
  try {
    const headers = new Headers({ Accept: "application/json" });
    const token = getToken(domain);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body !== undefined)
      headers.set("Content-Type", "application/json");
    if (options.key) headers.set("Idempotency-Key", options.key);
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "The server returned an invalid response",
      );
    });
    if (!response.ok || payload.success !== true) {
      if (
        response.status === 401 &&
        domain !== "public" &&
        getToken(domain) === token &&
        token
      )
        clearToken(domain);
      throw new ApiError(
        response.status,
        payload.error?.code ?? "REQUEST_FAILED",
        payload.error?.message ?? "Request failed",
        payload.requestId,
      );
    }
    return payload.data as T;
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR",
      controller.signal.aborted
        ? "Request timed out. Retry the same operation."
        : "Could not connect to the API",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
