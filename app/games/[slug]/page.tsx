import { Suspense } from "react";
import { GameDetail } from "../../features/games";
export const metadata = { title: "GameDetail" };
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <GameDetail slug={slug} />
    </Suspense>
  );
}
