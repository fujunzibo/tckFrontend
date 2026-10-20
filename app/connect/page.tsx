import { Suspense } from "react";
import Connect from "../features/connect";
export const metadata = {
  title: "connect",
  alternates: { canonical: "/connect" },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Connect />
    </Suspense>
  );
}
