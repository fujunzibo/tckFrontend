import { Suspense } from "react";
import Connect from "../../features/connect";
export const metadata = {
  title: "login",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Connect admin={true} />
    </Suspense>
  );
}
