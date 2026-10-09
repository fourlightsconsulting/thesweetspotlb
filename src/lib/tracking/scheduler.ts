// One loader for the ad platforms' scripts, ported from Thirty: they wait for
// the page's own load, then an idle moment (at most 3 s), so they never
// compete with the menu's photos or the first tap. Their queue stubs exist
// from the start, so nothing tracked meanwhile is lost.

const pending = new Set<() => void>();
let waitingForLoad = false;
let idleRequested = false;

function flush() {
  idleRequested = false;
  const tasks = [...pending];
  pending.clear();
  for (const task of tasks) task();
}

function scheduleIdle() {
  if (idleRequested || pending.size === 0) return;
  idleRequested = true;
  if (typeof window.requestIdleCallback === "function")
    window.requestIdleCallback(flush, { timeout: 3000 });
  else window.setTimeout(flush, 1200);
}

export function whenIdle(task: () => void) {
  pending.add(task);
  if (document.readyState === "complete") scheduleIdle();
  else if (!waitingForLoad) {
    waitingForLoad = true;
    window.addEventListener(
      "load",
      () => {
        waitingForLoad = false;
        scheduleIdle();
      },
      { once: true },
    );
  }
}

/** Adds a script tag once (by id), when the page is idle. */
export function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  whenIdle(() => {
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  });
}
