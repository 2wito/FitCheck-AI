"use client";

import { useCallback, useRef, useState } from "react";

const LIMIT = 50;

type History<T> = { past: T[]; present: T; future: T[] };

// State with undo/redo. Every `set` is one undo step, except during a gesture: wrap continuous
// changes (dragging, resizing) in beginGesture/endGesture so the whole drag undoes at once.
export function useHistoryState<T>(initial: () => T) {
  const [history, setHistory] = useState<History<T>>(() => ({
    past: [],
    present: initial(),
    future: [],
  }));
  // Snapshot from when the current gesture started.
  const gestureStart = useRef<T | null>(null);
  const inGesture = useRef(false);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setHistory((h) => {
      const value = typeof next === "function" ? (next as (prev: T) => T)(h.present) : next;
      if (Object.is(value, h.present)) return h;
      if (inGesture.current) return { ...h, present: value };
      return { past: [...h.past, h.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  const beginGesture = useCallback(() => {
    inGesture.current = true;
    setHistory((h) => {
      gestureStart.current = h.present;
      return h;
    });
  }, []);

  const endGesture = useCallback(() => {
    inGesture.current = false;
    setHistory((h) => {
      const start = gestureStart.current;
      gestureStart.current = null;
      if (start === null || Object.is(start, h.present)) return h;
      return { past: [...h.past, start].slice(-LIMIT), present: h.present, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) =>
      h.past.length === 0
        ? h
        : {
            past: h.past.slice(0, -1),
            present: h.past[h.past.length - 1],
            future: [h.present, ...h.future],
          },
    );
  }, []);

  const redo = useCallback(() => {
    setHistory((h) =>
      h.future.length === 0
        ? h
        : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) },
    );
  }, []);

  return {
    value: history.present,
    set,
    beginGesture,
    endGesture,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
