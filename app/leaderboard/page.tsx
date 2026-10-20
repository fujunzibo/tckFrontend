import { Suspense } from "react";
import { MemberPage } from "../features/member";
export const metadata = {
  title: "leaderboard",
  alternates: { canonical: "/leaderboard" },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <MemberPage page={"leaderboard"} />
    </Suspense>
  );
}
