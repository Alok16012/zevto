/* Demo bridge between the customer app, the technician app and the admin
 * console. Until the real backend exists, the three apps share a little state
 * through localStorage, so with two tabs open a booking reaches the
 * technician, the technician's ride shows up live for the customer, and tasks
 * sent to ops show up in the admin console. Same-origin tabs only. */

import { useSyncExternalStore } from "react";
import type { ServiceType } from "./data";

/** A customer booking that ops has assigned to a technician. */
export interface BridgeJob {
  id: string;
  techId: string;
  customer: { name: string; phone: string; address: string };
  type: ServiceType;
  product: string;
  date: string;
  slot: string;
  issue: string;
  /** Start code the customer reads out when the technician arrives. */
  otp: string;
  /** Photos of the purifier the customer attached. */
  photos?: string[];
}

export type TripStatus = "On the way" | "Arrived" | "In Progress" | "Completed";

/** Where a job is on the day — the customer only sees location once a ride starts. */
export interface Trip {
  jobId: string;
  techId: string;
  status: TripStatus;
  /** Epoch ms when the technician tapped Start Travel. */
  startedAt: number;
  distanceKm: number;
  etaMin: number;
}

/** A task a technician raised in the field and handed to ops. */
export interface OpsTask {
  id: string;
  techId: string;
  techName: string;
  customer: { name: string; phone: string; address: string };
  type: ServiceType;
  product: string;
  date: string;
  slot: string;
  issue: string;
  createdAt: string;
  status: "With ops" | "Assigned" | "Cancelled";
  assignedTo?: string;
}

export interface BridgeState {
  jobs: BridgeJob[];
  trips: Record<string, Trip>;
  opsTasks: OpsTask[];
  /** Technician profile photos as data URLs, by technician id. */
  photos: Record<string, string>;
}

const KEY = "zavtoo:bridge";
const EVENT = "zavtoo-bridge";
const EMPTY: BridgeState = { jobs: [], trips: {}, opsTasks: [], photos: {} };

let cacheRaw: string | null = null;
let cacheVal: BridgeState = EMPTY;

function read(): BridgeState {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  // useSyncExternalStore needs the same object back until something changes.
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  try { cacheVal = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY; } catch { cacheVal = EMPTY; }
  return cacheVal;
}

export function updateBridge(fn: (s: BridgeState) => BridgeState) {
  const next = fn(read());
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked — the apps keep working on their own state.
    return false;
  }
  window.dispatchEvent(new Event(EVENT));
  return true;
}

function subscribe(cb: () => void) {
  // "storage" fires for other tabs; our own event covers this tab.
  const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) cb(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, cb);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(EVENT, cb); };
}

export function useBridge(): BridgeState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export const setTrip = (jobId: string, patch: Partial<Trip> & { techId: string }) =>
  updateBridge((s) => {
    const prev = s.trips[jobId];
    const base: Trip = prev ?? { jobId, techId: patch.techId, status: "On the way", startedAt: Date.now(), distanceKm: 2.4, etaMin: 12 };
    const trip: Trip = { ...base, ...patch, jobId };
    return { ...s, trips: { ...s.trips, [jobId]: trip } };
  });

/** Demo only: how long the on-screen ride takes, whatever the real ETA says. */
export const DEMO_RIDE_MS = 60_000;
