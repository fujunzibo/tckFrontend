import { Suspense } from "react";
import AdminPage from "../../features/admin";
export const metadata = {
  title: "leaderboards",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <AdminPage section={"leaderboards"} />
    </Suspense>
  );
}
