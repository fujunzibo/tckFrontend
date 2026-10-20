"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearToken,
  getToken,
  request,
  resumeKey,
  setToken,
} from "./lib/api-client";
import type { Admin, Domain, User } from "./lib/contracts";
import { useWallet } from "./wallet";
import { signWalletMessage, WalletError } from "./lib/wallet";

interface Auth {
  user: User | null;
  admin: Admin | null;
  loading: boolean;
  login: (nickname: string, fresh?: boolean) => Promise<void>;
  walletLogin: () => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<void>;
  logout: (domain?: Domain) => Promise<void>;
}
const AuthContext = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [user, setUser] = useState<User | null>(null),
    [admin, setAdmin] = useState<Admin | null>(null),
    [loading, setLoading] = useState(true);
  const restore = useCallback(async () => {
    const userToken = getToken("user"),
      adminToken = getToken("admin");
    const results = await Promise.allSettled([
      userToken ? request<{ user: User }>("/auth/me") : Promise.resolve(null),
      adminToken
        ? request<{ admin: Admin }>("/admin/auth/me", { domain: "admin" })
        : Promise.resolve(null),
    ]);
    if (getToken("user") === userToken)
      setUser(
        results[0].status === "fulfilled"
          ? results[0].value?.user ?? null
          : null,
      );
    if (getToken("admin") === adminToken)
      setAdmin(
        results[1].status === "fulfilled"
          ? results[1].value?.admin ?? null
          : null,
      );
    setLoading(false);
  }, []);
  useEffect(() => {
    const changed = (event: Event) => {
      const domain = (event as CustomEvent).detail;
      if (domain === "user") setUser(null);
      if (domain === "admin") setAdmin(null);
      void restore();
    };
    const storage = () => {
      setUser(null);
      setAdmin(null);
      void restore();
    };
    const walletChanged = () => {
      if (getToken("user"))
        void request("/auth/logout", { method: "POST", body: {} }).catch(
          () => undefined,
        );
      clearToken("user");
      setUser(null);
    };
    void Promise.resolve().then(restore);
    window.addEventListener("wins:auth", changed);
    window.addEventListener("storage", storage);
    window.addEventListener("wins:refresh", restore);
    window.addEventListener("wins:wallet-change", walletChanged);
    return () => {
      window.removeEventListener("wins:auth", changed);
      window.removeEventListener("storage", storage);
      window.removeEventListener("wins:refresh", restore);
      window.removeEventListener("wins:wallet-change", walletChanged);
    };
  }, [restore]);
  async function walletLogin() {
    const connection = wallet.connection;
    if (!connection) throw new WalletError("walletDisconnected");
    const { address: walletAddress, chainId } = connection;
    await wallet.assertCurrent(connection);
    const challenge = await request<{
      nonce: string;
      message: string;
      expiresAt: string;
    }>("/auth/nonce", {
      domain: "public",
      method: "POST",
      body: { walletAddress, chainId: Number(BigInt(chainId)) },
    });
    if (
      !challenge.nonce ||
      typeof challenge.message !== "string" ||
      !challenge.message ||
      !(Date.parse(challenge.expiresAt) > Date.now())
    )
      throw new WalletError("walletInvalidChallenge");
    await wallet.assertCurrent(connection);
    const signature = await signWalletMessage(
      connection.wallet.provider,
      walletAddress,
      challenge.message,
    );
    await wallet.assertCurrent(connection);
    const ref =
      new URLSearchParams(window.location.search).get("ref") ??
      sessionStorage.getItem("wins:ref") ??
      undefined;
    const data = await request<{ user: User; accessToken: string }>(
      "/auth/login",
      {
        domain: "public",
        method: "POST",
        body: { walletAddress, nonce: challenge.nonce, signature, ref },
      },
    );
    await wallet.assertCurrent(connection);
    if (
      !data.accessToken ||
      data.user?.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()
    )
      throw new WalletError("walletInvalidResponse");
    setToken("user", data.accessToken);
    setUser(data.user);
    sessionStorage.removeItem("wins:ref");
  }
  async function login(nickname: string, fresh = false) {
    const ref =
      new URLSearchParams(window.location.search).get("ref") ??
      sessionStorage.getItem("wins:ref") ??
      undefined;
    const data = await request<{
      user: User;
      accessToken: string;
      resumeSecret: string;
    }>("/auth/demo-login", {
      domain: "public",
      method: "POST",
      body: {
        nickname,
        resumeSecret: fresh
          ? undefined
          : localStorage.getItem(resumeKey) ?? undefined,
        ref,
      },
    });
    localStorage.setItem(resumeKey, data.resumeSecret);
    setToken("user", data.accessToken);
    setUser(data.user);
    sessionStorage.removeItem("wins:ref");
  }
  async function adminLogin(username: string, password: string) {
    const data = await request<{ admin: Admin; accessToken: string }>(
      "/admin/auth/login",
      {
        domain: "public",
        method: "POST",
        body: { username: username.trim(), password },
      },
    );
    setToken("admin", data.accessToken);
    setAdmin(data.admin);
  }
  async function logout(domain: Domain = "user") {
    try {
      await request(
        domain === "admin" ? "/admin/auth/logout" : "/auth/logout",
        { domain, method: "POST", body: {} },
      );
    } finally {
      clearToken(domain);
      if (domain === "admin") setAdmin(null);
      else setUser(null);
    }
  }
  return (
    <AuthContext.Provider
      value={{ user, admin, loading, login, walletLogin, adminLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider missing");
  return auth;
}
