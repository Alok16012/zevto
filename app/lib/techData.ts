/* Sample data for the technician (partner) app at /technician. Stand-ins until
 * the jobs API is live — the demo is logged in as technician t1. */

import type { ServiceType } from "./data";

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

/** Van stock at the start of the day. */
export const INITIAL_STOCK: Record<string, number> = { sed: 8, carb: 6, mem: 2, uv: 3, pump: 1, sv: 4, tap: 5, pipe: 10 };

export const CHECKLIST = ["Checked inlet water pressure", "Inspected all filters", "Checked for leaks", "Sanitised storage tank", "Tested output TDS"];

export interface JobPart { id: string; qty: number }

export interface Job {
  id: string;
  type: ServiceType;
  customer: { name: string; phone: string; address: string; distanceKm: number };
  product: string;
  date: string;
  slot: string;
  issue: string;
  status: JobStatus;
  /** Visit charge the customer pays (0 for free installs / AMC visits). */
  visitCharge: number;
  /** Covered by an AMC — no visit charge, filters included. */
  amc: boolean;
  /** The customer reads this out on arrival. */
  otp: string;
  parts: JobPart[];
  checklist: string[];
  tdsBefore: string;
  tdsAfter: string;
  notes: string;
  payment?: "Cash" | "UPI" | "AMC covered";
  completedAt?: string;
  customerRating?: number;
  rescheduleReason?: string;
  /** Where the job came from, when it isn't normal dispatch. */
  source?: "Self-created" | "Customer app";
}

export const TECH_ID = "t1";

export const TODAY = "29 Sep 2026";

const blank = { parts: [], checklist: [], tdsBefore: "", tdsAfter: "", notes: "" };

export const INITIAL_JOBS: Job[] = [
  {
    id: "SRV1041", type: "Repair", product: "AquaPure RO Classic", date: TODAY, slot: "10:00 AM – 12:00 PM",
    customer: { name: "Alok Kumar", phone: "+919800000100", address: "B-42, Sector 62, Noida 201309", distanceKm: 2.4 },
    issue: "Water flow is very slow and the tank is not filling.", status: "In Progress",
    visitCharge: 499, amc: false, otp: "4821", ...blank, tdsBefore: "410", checklist: ["Checked inlet water pressure"],
  },
  {
    id: "SRV1046", type: "Installation", product: "AquaPure RO Pro", date: TODAY, slot: "12:00 – 02:00 PM",
    customer: { name: "Neha Gupta", phone: "+919800000101", address: "C-18, Sector 51, Noida 201301", distanceKm: 4.1 },
    issue: "New purifier delivered yesterday. Kitchen wall, near the sink.", status: "Accepted",
    visitCharge: 0, amc: false, otp: "7310", ...blank,
  },
  {
    id: "SRV1047", type: "AMC", product: "AquaPure RO Classic", date: TODAY, slot: "04:00 – 06:00 PM",
    customer: { name: "Sana Khan", phone: "+919800000102", address: "Flat 704, Supertech Capetown, Sector 74, Noida", distanceKm: 6.8 },
    issue: "2nd AMC visit — routine service and filter change.", status: "Accepted",
    visitCharge: 0, amc: true, otp: "5562", ...blank,
  },
  {
    id: "SRV1052", type: "Filter Change", product: "Kent Grand+", date: "30 Sep 2026", slot: "10:00 AM – 12:00 PM",
    customer: { name: "Rajesh Pandey", phone: "+919800000103", address: "H-9, Sector 27, Noida 201301", distanceKm: 5.2 },
    issue: "Water tastes salty. Filters last changed a year ago.", status: "Accepted",
    visitCharge: 899, amc: false, otp: "1904", ...blank,
  },
  {
    id: "SRV1053", type: "Water Test", product: "Other brand purifier", date: "01 Oct 2026", slot: "08:00 – 10:00 AM",
    customer: { name: "Vikram Singh", phone: "+919800000104", address: "A-3, Sector 15, Noida 201301", distanceKm: 7.5 },
    issue: "Moving to a new flat, want to test the supply before buying.", status: "Accepted",
    visitCharge: 199, amc: false, otp: "8826", ...blank,
  },
  {
    id: "SRV1038", type: "Repair", product: "AquaPure RO Pro", date: TODAY, slot: "08:00 – 10:00 AM",
    customer: { name: "Meena Verma", phone: "+919800000105", address: "D-77, Sector 41, Noida", distanceKm: 3.0 },
    issue: "Leak under the unit.", status: "Completed", visitCharge: 499, amc: false, otp: "0000",
    parts: [{ id: "sv", qty: 1 }, { id: "pipe", qty: 1 }], checklist: CHECKLIST, tdsBefore: "95", tdsAfter: "88",
    notes: "Replaced solenoid valve, re-sealed joints.", payment: "UPI", completedAt: `${TODAY}, 09:40 AM`, customerRating: 5,
  },
];

/** A fresh request that "arrives" a few seconds after the app opens. */
export const INCOMING_JOB: Job = {
  id: "SRV1058", type: "Repair", product: "AquaPure RO Premium", date: TODAY, slot: "02:00 – 04:00 PM",
  customer: { name: "Karan Joshi", phone: "+919800000106", address: "B-201, Mahagun Moderne, Sector 78, Noida", distanceKm: 3.6 },
  issue: "Display shows 'Filter error' and the purifier beeps continuously.", status: "New",
  visitCharge: 499, amc: false, otp: "3417", ...blank,
};

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

/** The six days before today (Tue 29 Sep); today is computed from live jobs. */
export const WEEK_EARNINGS = [
  { day: "Wed", amount: 1420, jobs: 5 },
  { day: "Thu", amount: 980, jobs: 4 },
  { day: "Fri", amount: 1760, jobs: 6 },
  { day: "Sat", amount: 2040, jobs: 7 },
  { day: "Sun", amount: 1210, jobs: 4 },
  { day: "Mon", amount: 1590, jobs: 5 },
];

export const PAYOUTS = [
  { id: "P0921", period: "15 – 21 Sep", amount: 8640, status: "Paid", at: "22 Sep 2026" },
  { id: "P0914", period: "08 – 14 Sep", amount: 7925, status: "Paid", at: "15 Sep 2026" },
  { id: "P0907", period: "01 – 07 Sep", amount: 8210, status: "Paid", at: "08 Sep 2026" },
];
