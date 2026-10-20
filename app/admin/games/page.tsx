import { Suspense } from "react";
import AdminPage from "../../features/admin";
export const metadata = {
  title: "games",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <AdminPage section={"games"} />
    </Suspense>
  );
}
