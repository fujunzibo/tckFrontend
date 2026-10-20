export type Locale = "zh" | "en" | "ja" | "ko";
export type Copy = Record<Locale, string>;
export type Domain = "public" | "user" | "admin";
export type PlatformMode = "demo" | "testnet" | "live";
export interface Page<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
export interface User {
  platformMode?: PlatformMode;
  id: string;
  nickname: string;
  walletAddress: string;
  invitationCode: string;
  inviterId?: string;
  pointsExact: string;
  level: string;
  createdAt: string;
  status: "normal" | "frozen";
}
export interface Admin {
  id: string;
  username: string;
  role: string;
}
export interface Asset {
  assetId: string;
  symbol: string;
  decimals: number;
  chainId: string;
  availableAtomic: string;
  lockedAtomic: string;
}
export interface Ledger {
  id: string;
  userId: string;
  assetId: string;
  amountAtomic: string;
  reason: string;
  createdAt: string;
  businessId: string;
}
export interface Game {
  id: string;
  slug: string;
  name: string;
  description: Copy;
  kind: string;
  chainId: string;
  assetId: string;
  entryId: string;
  mode: PlatformMode;
  status: "available" | "coming_soon";
  color: string;
  costAtomic: string;
  version: number;
}
export interface Quote {
  id: string;
  userId: string;
  gameId: string;
  choice: "heads" | "tails";
  amountAtomic: string;
  expiresAt: string;
  consumedBy?: string;
  ruleVersion: number;
}
export interface GameSession {
  platformMode?: PlatformMode;
  id: string;
  userId: string;
  gameId: string;
  choice: string;
  outcome: string;
  won: boolean;
  status: "playing" | "settled" | "failed";
  amountAtomic: string;
  payoutAtomic: string;
  assetId: string;
  readyAt: number;
  createdAt: string;
  version: number;
}
export interface Fighter {
  platformMode?: PlatformMode;
  id: string;
  userId: string;
  name: string;
  style: "striker" | "guardian" | "tactician";
  status: "generating" | "ready" | "failed";
  power: number;
  speed: number;
  defense: number;
  readyAt: number;
  createdAt: string;
  simulateFailure: boolean;
  refunded: boolean;
}
export interface Fight {
  platformMode?: PlatformMode;
  payoutAtomic: string;
  assetId: string;
  id: string;
  userId: string;
  fighterId: string;
  opponent: string;
  status: "queued" | "live" | "settled" | "failed";
  won: boolean;
  readyAt: number;
  createdAt: string;
  version: number;
}
export interface Quest {
  id: string;
  title: Copy;
  description: Copy;
  type: "daily" | "game" | "social";
  rewardAmount: string;
  rewardType: "points";
  reviewMode: "auto" | "manual";
  status: "published" | "draft" | "offline";
  startTime: string;
  endTime: string;
  version: number;
  userStatus?: string;
}
export interface Submission {
  id: string;
  userId: string;
  questId: string;
  periodKey: string;
  status: "pending_review" | "completed" | "rejected" | "reward_claimed";
  proof: string;
  version: number;
  submittedAt: string;
  rejectReason?: string;
  history: { proof: string; reason?: string; submittedAt: string }[];
  rewardGrantId?: string;
}
export interface Reward {
  id: string;
  userId: string;
  questId: string;
  recordId: string;
  title: Copy;
  amountAtomic: string;
  assetId: "POINTS";
  status: "eligible" | "issued";
  createdAt: string;
}
export interface Notice {
  id: string;
  userId: string;
  type: "system" | "game" | "fighter" | "reward" | "quest";
  title: Copy;
  body: Copy;
  href: string;
  readAt?: string;
  createdAt: string;
}
export interface Audit {
  id: string;
  actor: string;
  action: string;
  target: string;
  reason: string;
  createdAt: string;
}
export interface Config {
  platformMode: PlatformMode;
  text: Record<string, Copy>;
  modes: { id: string; label: Copy }[];
  gameKinds: { id: string; name: string }[];
  gameAssets: string[];
  entries: { id: string; name: string }[];
  catalog: { id: string; slug: string; name: string; mode: string }[];
  fighterCreation: { amountAtomic: string; assetId: string };
  features: {
    demoLogin: boolean;
    fighterFailureSimulation: boolean;
    rewardBudgets?: boolean;
    payments: boolean;
    tournaments: boolean;
    noova: boolean;
  };
  chains: { id: string; name: string }[];
}
export interface Dashboard {
  user: User;
  assets: Asset[];
  sessions: GameSession[];
  fighters: Fighter[];
  unread: number;
  completedQuests: number;
  claimable: number;
}
export interface Settings {
  version: number;
  maintenance: boolean;
  gameCostAtomic: string;
  maxFighters: number;
}
export const copy = (zh: string, en: string, ja: string, ko: string): Copy => ({
  zh,
  en,
  ja,
  ko,
});
