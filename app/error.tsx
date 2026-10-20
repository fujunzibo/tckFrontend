"use client";
import { DataState } from "./ui/primitives";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="container page">
      <DataState error={error} retry={reset} />
    </main>
  );
}
