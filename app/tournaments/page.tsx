import { Suspense } from "react";
import { MemberPage } from "../features/member";
export const metadata = {
  title: "tournaments",
  alternates: { canonical: "/tournaments" },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <MemberPage page={"tournaments"} />
    </Suspense>
  );
}
