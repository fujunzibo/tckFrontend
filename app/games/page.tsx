import { Suspense } from "react";
import { Games } from "../features/games";
export const metadata = { title: "games", alternates: { canonical: "/games" } };
export default function Page() {
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <Games />
    </Suspense>
  );
}
