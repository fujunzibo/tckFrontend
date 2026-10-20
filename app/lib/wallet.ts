export interface WalletProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: (value: unknown) => void): void;
  removeListener(event: string, listener: (value: unknown) => void): void;
}
export interface WalletOption {
  id: string;
  name: string;
  provider: WalletProvider;
}
export interface WalletConnection {
  wallet: WalletOption;
  address: string;
  chainId: string;
}
export class WalletError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function walletAddress(accounts: unknown): string | null {
  const address = Array.isArray(accounts) ? accounts[0] : undefined;
  return typeof address === "string" && /^0x[\da-f]{40}$/i.test(address)
    ? address
    : null;
}
export function walletChain(value: unknown): string {
  if (typeof value !== "string" || !/^0x[\da-f]+$/i.test(value))
    throw new WalletError("walletInvalidResponse");
  return `0x${BigInt(value).toString(16)}`;
}
export function sameWallet(
  a: WalletConnection | null,
  b: WalletConnection | null,
) {
  return (
    a?.wallet.provider === b?.wallet.provider &&
    a?.address.toLowerCase() === b?.address.toLowerCase() &&
    a?.chainId === b?.chainId
  );
}
export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
export async function signWalletMessage(
  provider: WalletProvider,
  address: string,
  message: string,
) {
  const hex = Array.from(new TextEncoder().encode(message), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const signature = await provider.request({
    method: "personal_sign",
    params: [`0x${hex}`, address],
  });
  if (typeof signature !== "string" || !/^0x(?:[\da-f]{2})+$/i.test(signature))
    throw new WalletError("walletInvalidResponse");
  return signature;
}
export function walletErrorText(error: unknown, t: (key: string) => string) {
  const code = (error as { code?: string | number })?.code;
  if (code === 4001) return t("walletRejected");
  if (code === -32002) return t("walletPending");
  if (code === 4900 || code === 4901) return t("walletDisconnected");
  if (code === "FEATURE_DISABLED") return t("walletLoginUnavailable");
  if (error instanceof WalletError) return t(error.code);
  return error instanceof Error ? error.message : t("error");
}
