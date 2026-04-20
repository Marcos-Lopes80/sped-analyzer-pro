/**
 * Lightweight in-memory store for parsed SPED files.
 * Persists across route navigations; cleared on full page reload.
 * (For Stage 2 we'll add backend persistence.)
 */
import { useSyncExternalStore } from "react";
import type { SpedSummary } from "./parser";

export interface SpedFileEntry {
  id: string;
  uploadedAt: number;
  summary: SpedSummary;
}

let entries: SpedFileEntry[] = [];
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

export const spedStore = {
  add(summary: SpedSummary) {
    const entry: SpedFileEntry = {
      id: crypto.randomUUID(),
      uploadedAt: Date.now(),
      summary,
    };
    entries = [entry, ...entries];
    emit();
    return entry;
  },
  remove(id: string) {
    entries = entries.filter((e) => e.id !== id);
    emit();
  },
  clear() { entries = []; emit(); },
  get() { return entries; },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSpedEntries(): SpedFileEntry[] {
  return useSyncExternalStore(
    spedStore.subscribe,
    spedStore.get,
    () => entries,
  );
}
