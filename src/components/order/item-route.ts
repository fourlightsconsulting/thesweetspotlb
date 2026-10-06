// The open customiser lives in the URL (?item=…, plus &line=… when editing), so
// it can be linked to (the home page does) and the back button closes it.

const OPENED_HERE = "tssItem";

export function openItem(itemId: string, lineKey?: string) {
  const params = new URLSearchParams({ item: itemId });
  if (lineKey) params.set("line", lineKey);
  window.history.pushState({ [OPENED_HERE]: true }, "", `?${params}`);
}

/** Steps back if this page opened it; a deep link (?item=… on arrival) is replaced instead. */
export function closeItem() {
  const state: unknown = window.history.state;
  if (typeof state === "object" && state !== null && OPENED_HERE in state) window.history.back();
  else window.history.replaceState(null, "", window.location.pathname);
}
