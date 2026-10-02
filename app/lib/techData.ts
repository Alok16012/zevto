/* Shapes and business rules for the technician (partner) app at /technician.
 * Jobs, stock and payouts come from Supabase; PARTS starts with the database
 * seed and is replaced with live rows once the app loads. */

import { todayLabel, type ServiceType } from "./data";

export type JobStatus = "New" | "Accepted" | "On the way" | "Arrived" | "In Progress" | "Completed" | "Rejected" | "Rescheduled";

/** The happy path a job walks through, in order. */
export const JOB_FLOW: JobStatus[] = ["Accepted", "On the way", "Arrived", "In Progress", "Completed"];

export interface Part {
  id: string;
  name: string;
  price: number;
}

export const PARTS: Part[] = [
  { id: "sed", name: "Sediment filter", price: 180 },
  { id: "carb", name: "Carbon filter", price: 250 },
  { id: "mem", name: "RO membrane 80 GPD", price: 1800 },
  { id: "uv", name: "UV lamp 11W", price: 650 },
  { id: "pump", name: "Booster pump", price: 1400 },
  { id: "sv", name: "Solenoid valve", price: 350 },
  { id: "tap", name: "Tank tap", price: 120 },
  { id: "pipe", name: "Pipe & connector set", price: 90 },
];

export const partById = (id: string) => PARTS.find((p) => p.id === id);

export const CHECKLIST = ["Checked inlet water pressure", "Inspected all filters", "Checked for leaks", "Sanitised storage tank", "Tested output TDS"];

export interface JobPart { id: string; qty: number }

export interface Job {
  id: string;
  /** Human reference, e.g. SRV1017. */
  ref: string;
  type: ServiceType;
  customer: { name: string; phone: string; address: string; distanceKm: number | null; lat?: number | null; lng?: number | null };
  pincode: string;
  product: string;
  date: string;
  slot: string;
  issue: string;
  status: JobStatus;
  /** Visit charge the customer pays (0 for free installs / AMC visits). */
  visitCharge: number;
  /** Covered by an AMC — no visit charge, filters included. */
  amc: boolean;
  /** The customer has the app, so they hold a start code (technicians never see it). */
  needsCode: boolean;
  /** Legacy browser-bridge code only; live jobs verify codes on the server. */
  otp?: string;
  parts: JobPart[];
  checklist: string[];
  tdsBefore: string;
  tdsAfter: string;
  notes: string;
  payment?: "Cash" | "UPI" | "AMC covered";
  completedAt?: string;
  customerRating?: number;
  rescheduleReason?: string;
  /** Photos of the purifier the customer attached (storage paths). */
  photos?: string[];
  /** Sorting key: "YYYY-MM-DD". */
  isoDate: string;
  completedIso?: string | null;
  /** Where the job came from, when it isn't normal dispatch. */
  source?: "Self-created" | "Customer app";
}

/** Today as "YYYY-MM-DD" in local time — jobs compare dates in this format. */
export const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* ───────────── Earnings ───────────── */

/** What the technician keeps: a share of the visit charge, a flat fee for free
 * jobs, and a commission on parts sold. */
export const PAYOUT = { visitShare: 0.6, freeJobFee: 250, partsCommission: 0.1 };

export const partsTotal = (j: Job) =>
  j.parts.reduce((s, p) => s + (partById(p.id)?.price ?? 0) * p.qty, 0);

/** Parts are free for AMC customers (filters are included in the plan). */
export const customerBill = (j: Job) => (j.amc ? 0 : j.visitCharge + partsTotal(j));

export const jobPayout = (j: Job) =>
  Math.round((j.visitCharge ? j.visitCharge * PAYOUT.visitShare : PAYOUT.freeJobFee) + partsTotal(j) * PAYOUT.partsCommission);

/** Empty compatibility defaults while legacy partner screens migrate to queries. */
export const INITIAL_JOBS: Job[] = [];
export const INITIAL_STOCK: Record<string, number> = {};
export const INCOMING_JOB: Job | null = null;
export const TECH_ID = "";
export const TODAY = todayLabel();
export const WEEK_EARNINGS: { day: string; amount: number; jobs: number }[] = [];
export const PAYOUTS: { id: string; period: string; amount: number; status: string; at: string }[] = [];
