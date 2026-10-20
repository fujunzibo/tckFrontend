import { Suspense } from "react";
import { Quests } from "../features/quests";
export const metadata = {
  title: "quests",
  alternates: { canonical: "/quests" },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Quests />
    </Suspense>
  );
}
