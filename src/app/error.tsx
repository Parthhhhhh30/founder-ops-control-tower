"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="boot">
      <h1>Workspace could not load</h1>
      <p>Your locally saved demo data is preserved.</p>
      <button onClick={reset}>Retry workspace</button>
    </main>
  );
}
