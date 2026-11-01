/** Shown at once while a page loads, inside the sidebar. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="mb-6 h-8 w-44 rounded-[10px] bg-line" />
      <div className="mb-5 h-9 w-full max-w-md rounded-[10px] bg-tint" />
      <div className="card divide-y divide-line">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center gap-3 px-4 py-3.5">
            <div className="size-10 flex-none rounded-[10px] bg-tint" />
            <div className="flex-1">
              <div className="h-3.5 w-1/3 rounded bg-line" />
              <div className="mt-2 h-3 w-1/5 rounded bg-tint" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
