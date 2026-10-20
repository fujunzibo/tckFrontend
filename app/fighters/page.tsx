import { Suspense } from "react";
import { Fighters } from "../features/fighters";
export const metadata = {
  title: "fighters",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Fighters />
    </Suspense>
  );
}
