import { Suspense } from "react";
import { GameHistory } from "../../features/games";
export const metadata = {
  title: "history",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <GameHistory />
    </Suspense>
  );
}
