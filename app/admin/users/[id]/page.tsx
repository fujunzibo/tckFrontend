import { Suspense } from "react";
import AdminPage from "../../../features/admin";
export const metadata = {
  title: "AdminPage",
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
      <AdminPage id={id} section="users" />
    </Suspense>
  );
}
