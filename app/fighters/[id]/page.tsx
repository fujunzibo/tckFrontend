import { Suspense } from "react";
import { FighterDetail } from "../../features/fighters";
export const metadata = {
  title: "FighterDetail",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="container page">TCK WINS…</div>}>
      <FighterDetail id={id} />
    </Suspense>
  );
}
