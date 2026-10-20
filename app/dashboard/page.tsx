import { Suspense } from "react";
import { MemberPage } from "../features/member";
export const metadata = {
  title: "dashboard",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <MemberPage page={"dashboard"} />
    </Suspense>
  );
}
