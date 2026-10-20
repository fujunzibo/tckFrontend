import { Suspense } from "react";
import { Rewards } from "../features/quests";
export const metadata = {
  title: "rewards",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Rewards />
    </Suspense>
  );
}
