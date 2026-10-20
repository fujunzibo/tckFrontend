"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  sameWallet,
  walletAddress,
  walletChain,
  WalletError,
  type WalletConnection,
  type WalletOption,
  type WalletProvider as EthereumProvider,
} from "./lib/wallet";

const providerKey = "wins:wallet-provider";
const connectionKey = "wins:wallet-connection";
interface WalletState {
  wallets: WalletOption[];
  connection: WalletConnection | null;
  connecting: boolean;
  connect: (wallet: WalletOption) => Promise<void>;
  disconnect: () => void;
  assertCurrent: (connection: WalletConnection) => Promise<void>;
}
const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const current = useRef<WalletConnection | null>(null);
  const detach = useRef(() => {});
  const attempt = useRef(0);
  const publish = useCallback(
    (next: WalletConnection | null, invalidate = true) => {
      if (sameWallet(current.current, next)) return;
      const previous = localStorage.getItem(connectionKey);
      const identity = next
        ? `${next.address.toLowerCase()}:${next.chainId}`
        : null;
      if (identity) localStorage.setItem(connectionKey, identity);
      else localStorage.removeItem(connectionKey);
      current.current = next;
      setConnection(next);
      if (invalidate || (previous && previous !== identity))
        window.dispatchEvent(new Event("wins:wallet-change"));
    },
    [],
  );
  const disconnect = useCallback(() => {
    attempt.current++;
    detach.current();
    detach.current = () => {};
    localStorage.removeItem(providerKey);
    publish(null);
    setConnecting(false);
  }, [publish]);
  const connect = useCallback(
    async (wallet: WalletOption, interactive = true) => {
      const ticket = ++attempt.current;
      setConnecting(true);
      try {
        const address = walletAddress(
          await wallet.provider.request({
            method: interactive ? "eth_requestAccounts" : "eth_accounts",
          }),
        );
        if (!address) {
          if (interactive) throw new WalletError("walletDisconnected");
          return;
        }
        const chainId = walletChain(
          await wallet.provider.request({ method: "eth_chainId" }),
        );
        if (ticket !== attempt.current) throw new WalletError("walletChanged");
        detach.current();
        const accountsChanged = (accounts: unknown) => {
          const address = walletAddress(accounts);
          if (!address) return disconnect();
          if (current.current?.wallet.provider === wallet.provider)
            publish({ ...current.current, address });
        };
        const chainChanged = (value: unknown) => {
          if (current.current?.wallet.provider !== wallet.provider) return;
          try {
            publish({ ...current.current, chainId: walletChain(value) });
          } catch {
            disconnect();
          }
        };
        wallet.provider.on("accountsChanged", accountsChanged);
        wallet.provider.on("chainChanged", chainChanged);
        wallet.provider.on("disconnect", disconnect);
        detach.current = () => {
          wallet.provider.removeListener("accountsChanged", accountsChanged);
          wallet.provider.removeListener("chainChanged", chainChanged);
          wallet.provider.removeListener("disconnect", disconnect);
        };
        localStorage.setItem(providerKey, wallet.id);
        publish({ wallet, address, chainId }, interactive);
      } finally {
        if (ticket === attempt.current) setConnecting(false);
      }
    },
    [disconnect, publish],
  );

  useEffect(() => {
    const requests = attempt;
    const subscriptions = detach;
    let mounted = true;
    let restoring = false;
    const add = (wallet: WalletOption) => {
      if (
        !mounted ||
        typeof wallet.provider?.request !== "function" ||
        typeof wallet.provider.on !== "function" ||
        typeof wallet.provider.removeListener !== "function"
      )
        return;
      setWallets((items) => {
        const others = items.filter(
          (item) => item.provider !== wallet.provider && item.id !== wallet.id,
        );
        return [...others, wallet];
      });
      if (!restoring && localStorage.getItem(providerKey) === wallet.id) {
        restoring = true;
        void connect(wallet, false).catch(() => {});
      }
    };
    const announce = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          info: { rdns: string; name: string };
          provider: EthereumProvider;
        }>
      ).detail;
      if (detail?.info?.rdns && detail.info.name)
        add({
          id: detail.info.rdns,
          name: detail.info.name,
          provider: detail.provider,
        });
    };
    const discover = () => {
      const provider = (window as Window & { ethereum?: EthereumProvider })
        .ethereum;
      if (provider) add({ id: "injected", name: "Browser wallet", provider });
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    };
    window.addEventListener("eip6963:announceProvider", announce);
    window.addEventListener("ethereum#initialized", discover);
    void Promise.resolve().then(() => {
      if (mounted) discover();
    });
    return () => {
      mounted = false;
      requests.current++;
      subscriptions.current();
      window.removeEventListener("eip6963:announceProvider", announce);
      window.removeEventListener("ethereum#initialized", discover);
    };
  }, [connect]);

  async function assertCurrent(expected: WalletConnection) {
    if (current.current !== expected) throw new WalletError("walletChanged");
    const address = walletAddress(
      await expected.wallet.provider.request({ method: "eth_accounts" }),
    );
    const chainId = walletChain(
      await expected.wallet.provider.request({ method: "eth_chainId" }),
    );
    if (
      current.current !== expected ||
      !address ||
      !sameWallet(expected, { ...expected, address, chainId })
    )
      throw new WalletError("walletChanged");
  }
  return (
    <WalletContext.Provider
      value={{
        wallets,
        connection,
        connecting,
        connect,
        disconnect,
        assertCurrent,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
export function useWallet() {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("WalletProvider missing");
  return wallet;
}
