"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// The new-order sound for the counter: a three-note chime made in the
// browser (no audio file), plus keeping the screen awake while the sound is
// on. Browsers only allow sound after a tap, so the board asks for one.

const STORAGE_KEY = "tss-admin-sound";

function playChime(ctx: AudioContext) {
  const start = ctx.currentTime + 0.02;
  [880, 1318.5, 1760].forEach((frequency, i) => {
    const at = start + i * 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.75);
  });
}

// Whether the sound is wanted, remembered on this device.
const listeners = new Set<() => void>();
const preference = {
  subscribe(onChange: () => void) {
    listeners.add(onChange);
    return () => void listeners.delete(onChange);
  },
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      return false;
    }
  },
  set(on: boolean) {
    try {
      if (on) localStorage.setItem(STORAGE_KEY, "on");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    for (const listener of listeners) listener();
  },
};

export type Chime = {
  /** The person wants the sound on. */
  wanted: boolean;
  /** Wanted, but the browser needs a tap before it can play. */
  blocked: boolean;
  turnOn: () => void;
  turnOff: () => void;
  ring: () => void;
};

export function useChime(): Chime {
  const ctxRef = useRef<AudioContext | null>(null);
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const wanted = useSyncExternalStore(preference.subscribe, preference.get, () => false);
  const [running, setRunning] = useState(false);

  const keepAwake = useCallback(async () => {
    try {
      if (document.visibilityState === "visible" && !lockRef.current) {
        lockRef.current = await navigator.wakeLock?.request("screen");
        lockRef.current?.addEventListener("release", () => (lockRef.current = null));
      }
    } catch {
      // Not supported, or refused (battery saver): the sound still works.
    }
  }, []);

  const unlock = useCallback(async () => {
    ctxRef.current ??= new AudioContext();
    await ctxRef.current.resume().catch(() => undefined);
    setRunning(ctxRef.current.state === "running");
    void keepAwake();
  }, [keepAwake]);

  // On from last time: the first tap anywhere lets it play.
  useEffect(() => {
    if (!wanted || running) return;
    const onTap = () => void unlock();
    document.addEventListener("pointerdown", onTap, { once: true });
    return () => document.removeEventListener("pointerdown", onTap);
  }, [wanted, running, unlock]);

  useEffect(() => {
    if (!wanted) return;
    const onVisible = () => void keepAwake();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [wanted, keepAwake]);

  const turnOn = () => {
    preference.set(true);
    void unlock().then(() => {
      if (ctxRef.current?.state === "running") playChime(ctxRef.current);
    });
  };

  const turnOff = () => {
    preference.set(false);
    void lockRef.current?.release();
  };

  const ring = () => {
    const ctx = ctxRef.current;
    if (wanted && ctx?.state === "running") playChime(ctx);
  };

  return { wanted, blocked: wanted && !running, turnOn, turnOff, ring };
}
