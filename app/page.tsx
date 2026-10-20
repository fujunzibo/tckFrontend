import { Suspense } from "react";
import Home from "./features/home";
export const metadata = {
  title: "Play. Grow. Belong.",
  alternates: { canonical: "/" },
};
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Home />
    </Suspense>
  );
}
