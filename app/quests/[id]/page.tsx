import { Suspense } from "react";
import { QuestDetail } from "../../features/quests";
export const metadata = {
  title: "QuestDetail",
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
      <QuestDetail id={id} />
    </Suspense>
  );
}
