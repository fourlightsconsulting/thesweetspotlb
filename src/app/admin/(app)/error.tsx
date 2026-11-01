"use client";

/** A page that failed to load: the sidebar stays, with a way to try again. */
export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <h1 className="text-base font-bold">This page didn’t load</h1>
      <p className="mt-1 text-muted">Your saved work is safe.</p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-4">
        Try again
      </button>
    </div>
  );
}
