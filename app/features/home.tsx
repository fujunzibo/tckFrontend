"use client";
import Link from "next/link";
import { PageShell } from "../components";
import { useCopy } from "../lib/copy";
import { useApi } from "../lib/hooks";
import type { Game, Page } from "../lib/contracts";
import {
  DataState,
  FighterArt,
  GameArt,
  GameCard,
  Icon,
} from "../ui/primitives";

export default function Home() {
  const { t, line } = useCopy();
  const games = useApi<Page<Game>>("/games", "public");
  const summary = useApi<{
    games: number;
    rounds: number;
    fighters: number;
    members: number;
  }>("/public/home-summary", "public");
  return (
    <PageShell>
      <main>
        <section className="wins-hero container">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="pulse-dot" />
              THE NEXT CHAPTER OF WEB3 PLAY
            </div>
            <h1>
              {line(
                "每一次参与，",
                "Make every",
                "すべてのプレイに",
                "모든 플레이를",
              )}
              <br />
              <span>
                {line(
                  "都有新的可能。",
                  "play matter.",
                  "新しい可能性を。",
                  "새로운 가능성으로.",
                )}
              </span>
            </h1>
            <p>
              {line(
                "探索游戏，创造你的 AI 角色，与社区一起成长。你的下一段冒险，从 TCK Wins 开始。",
                "Discover games. Create your AI fighter. Grow with your community. Your next adventure starts at TCK Wins.",
                "ゲームを探索し、AIファイターを作成し、コミュニティと成長。次の冒険はTCK Winsから。",
                "게임을 탐험하고 AI 파이터를 만드세요. 커뮤니티와 함께하는 모험이 TCK Wins에서 시작됩니다.",
              )}
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/games">
                {t("explore")}
                <Icon name="arrow" />
              </Link>
              <Link className="btn btn-secondary" href="/fighters">
                {t("createFighter")}
                <Icon name="fighters" />
              </Link>
            </div>
            <div className="hero-trust">
              <span>
                <Icon name="check" size={16} />
                {line(
                  "游戏 × AI × 社区",
                  "Games × AI × Community",
                  "ゲーム × AI × コミュニティ",
                  "게임 × AI × 커뮤니티",
                )}
              </span>
              <span>
                <Icon name="check" size={16} />
                {t("preview")}
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-visual-top">
              <span className="tiny-tag">TCK ORIGINALS</span>
              <span className="accent">✦ PLAY YOUR WAY</span>
            </div>
            <GameArt kind="coin_flip" large />
            <div className="hero-float float-left">
              <span className="float-icon">
                <Icon name="rewards" />
              </span>
              <div>
                <small>
                  {line(
                    "探索你的第一份奖励",
                    "YOUR NEXT REWARD",
                    "次の報酬を発見",
                    "다음 보상을 발견",
                  )}
                </small>
                <strong>{t("quests")} ↗</strong>
              </div>
            </div>
            <div className="hero-float float-right">
              <span className="pulse-dot" />
              <div>
                <small>AI ARENA</small>
                <strong>
                  {line(
                    "为下一场对战而生",
                    "BUILT FOR THE NEXT ROUND",
                    "次の対戦へ",
                    "다음 대전을 위해",
                  )}
                </strong>
              </div>
            </div>
            <div className="hero-visual-bottom">
              <span>01 / COIN FLIP</span>
              <Link href="/games/coin-flip">
                {t("play")} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>
        <div className="container platform-metrics">
          {[
            {
              value: summary.data?.games,
              label: line(
                "探索玩法",
                "Games to discover",
                "ゲームの種類",
                "탐험할 게임",
              ),
            },
            {
              value: summary.data?.rounds,
              label: t("homeRounds"),
            },
            {
              value: summary.data?.fighters,
              label: line(
                "AI 角色已就绪",
                "AI fighters ready",
                "AIファイター準備完了",
                "준비된 AI 파이터",
              ),
            },
            {
              value: summary.data?.members,
              label: t("homeMembers"),
            },
          ].map((m) => (
            <div key={m.label}>
              <strong>{m.value ?? "—"}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <section className="container wins-section">
          <div className="section-head">
            <div>
              <div className="eyebrow">FIND YOUR NEXT FAVORITE</div>
              <h2>
                {line(
                  "好玩的，都在这里。",
                  "Your next favorite is here.",
                  "次のお気に入りを見つけよう。",
                  "다음 최애 게임을 만나세요.",
                )}
              </h2>
              <p>
                {line(
                  "从轻松的一局开始，探索更多玩法。",
                  "Start with a quick round. Discover something new.",
                  "気軽な一戦から、新しい発見へ。",
                  "가벼운 한 판으로 새로운 재미를 발견하세요.",
                )}
              </p>
            </div>
            <Link className="text-link" href="/games">
              {t("games")} <Icon name="arrow" />
            </Link>
          </div>
          <DataState {...games} retry={games.reload}>
            <div className="game-grid">
              {games.data?.items.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </DataState>
        </section>
        <section className="container arena-banner">
          <div>
            <div className="eyebrow">MEET YOUR NEXT CHAMPION</div>
            <h2>
              {line(
                "不止玩家。",
                "More than a player.",
                "プレイヤーを超えて。",
                "플레이어 그 이상.",
              )}
              <br />
              {line(
                "成为创造者。",
                "Become a creator.",
                "クリエイターになろう。",
                "크리에이터가 되세요.",
              )}
            </h2>
            <p>{t("homeFighters")}</p>
            <Link className="btn btn-primary" href="/fighters">
              {t("fighters")}
              <Icon name="arrow" />
            </Link>
          </div>
          <div className="arena-art">
            <FighterArt style="striker" />
            <FighterArt style="guardian" />
          </div>
          <span className="banner-watermark">ARENA</span>
        </section>
        <section className="container wins-section">
          <div className="section-head">
            <div>
              <div className="eyebrow">A LITTLE MORE EVERY DAY</div>
              <h2>
                {line(
                  "玩出成长，连接彼此。",
                  "Play. Grow. Belong.",
                  "遊んで、成長し、つながる。",
                  "플레이하고, 성장하고, 연결되세요.",
                )}
              </h2>
            </div>
          </div>
          <div className="grid grid-3">
            {[
              {
                icon: "quests",
                key: "quests",
                href: "/quests",
                text: line(
                  "完成日常与游戏任务，让每一次探索都有收获。",
                  "Turn everyday play into meaningful progress.",
                  "毎日のプレイを、成長につなげよう。",
                  "매일의 플레이를 성장으로 바꾸세요.",
                ),
              },
              {
                icon: "rewards",
                key: "rewards",
                href: "/rewards",
                text: line(
                  "所有奖励清晰可见，领取状态随时可查。",
                  "See every reward and follow it all the way.",
                  "すべての報酬と受取状況を確認。",
                  "모든 보상과 수령 상태를 확인하세요.",
                ),
              },
              {
                icon: "profile",
                key: "invite",
                href: "/invite",
                text: line(
                  "邀请好友加入，用共同的探索留下新的故事。",
                  "Bring a friend. Make the next adventure yours.",
                  "友達を招待して、新しい冒険を。",
                  "친구와 함께 새로운 모험을 시작하세요.",
                ),
              },
            ].map((x, i) => (
              <Link className="card benefit-card" href={x.href} key={x.key}>
                <span className="benefit-index">0{i + 1}</span>
                <Icon name={x.icon} size={28} />
                <h3>{t(x.key)}</h3>
                <p>{x.text}</p>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
