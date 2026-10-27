type StorageName = "localStorage" | "sessionStorage";

// Failed writes remain readable for this page, including stable retry keys.
const fallback: Record<StorageName, Map<string, string | null>> = {
  localStorage: new Map(),
  sessionStorage: new Map(),
};

export function readBrowserStorage(name: StorageName, key: string): string | null {
  if (typeof window === "undefined") return null;
  if (fallback[name].has(key)) return fallback[name].get(key) ?? null;
  try {
    return window[name].getItem(key);
  } catch {
    return null;
  }
}

export function writeBrowserStorage(name: StorageName, key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window[name].removeItem(key);
    else window[name].setItem(key, value);
    fallback[name].delete(key);
  } catch {
    // Accessing the storage property itself can throw, not just its methods.
    fallback[name].set(key, value);
  }
}
