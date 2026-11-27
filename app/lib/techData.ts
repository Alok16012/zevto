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

/** A part on a job: from the van (id = parts row), from the technician's shop stock
 * (listing), or bought on the spot (own, with name and price). Completed jobs carry
 * the name and price of every line. */
export interface JobPart {
  qty: number;
  id?: string;
  listing?: string;
  own?: boolean;
  src?: "van" | "stock" | "own";
  name?: string;
  price?: number;
}

/** Stable key for a part line. */
export const partKey = (p: JobPart) => p.listing ? `l:${p.listing}` : p.own ? `o:${p.name}` : `v:${p.id}`;
export const partName = (p: JobPart) => p.name ?? partById(p.id ?? "")?.name ?? "Part";
export const partPrice = (p: JobPart) => p.price ?? partById(p.id ?? "")?.price ?? 0;

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
  /** Secret for the customer's bill link. */
  billToken?: string;
  /** Where the job came from, when it isn't normal dispatch. */
  source?: "Self-created" | "Customer app";
  /** This complaint repeats job #ref (closed within the last 7 days) — it's free. */
  repeatOfRef?: string | null;
  /** True when the technician on this repeat is the one who closed the original job. */
  repeatSelf?: boolean;
  /** This job came back as repeat complaint #ref — its earning is cut. */
  repeatedByRef?: string | null;
}

/** Today as "YYYY-MM-DD" in local time — jobs compare dates in this format. */
export const todayIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* ───────────── Earnings ───────────── */

/** How a technician is paid (Admin → Earning Schedules, table earning_schedules). */
export type PayBasis = "Commission" | "Salary" | "Salary + Commission";
export type RateMode = "Percent" | "Fixed";
export interface EarningSchedule {
  id: string; name: string; pay_basis: PayBasis; monthly_salary: number;
  /** Percent: % of the visit charge; Fixed: ₹ per completed job. */
  service_mode: RateMode; service_value: number;
  /** ₹ per free job (installs, AMC visits). */
  free_job_fee: number;
  /** Percent: % of the parts value; Fixed: ₹ per part unit fitted. */
  parts_mode: RateMode; parts_value: number;
  /** ₹ per km to the customer, doubled when round_trip. */
  km_rate: number; round_trip: boolean; is_default: boolean;
}

/** The pay built into the app before schedules; used until the technician's own schedule loads. */
export const DEFAULT_SCHEDULE: EarningSchedule = {
  id: "", name: "Standard commission", pay_basis: "Commission", monthly_salary: 0,
  service_mode: "Percent", service_value: 60, free_job_fee: 250, parts_mode: "Percent", parts_value: 10,
  km_rate: 0, round_trip: true, is_default: true,
};

/** The signed-in technician's schedule — replaced with their live one once the app loads. */
export let PAY: EarningSchedule = DEFAULT_SCHEDULE;
export const setPaySchedule = (s: EarningSchedule | null) => { PAY = s ? { ...s, km_rate: Number(s.km_rate) || 0 } : DEFAULT_SCHEDULE; };

export const partsTotal = (j: Job) =>
  j.parts.reduce((s, p) => s + partPrice(p) * p.qty, 0);

/** Parts are free for AMC customers (filters are included in the plan). */
export const customerBill = (j: Job) => (j.amc || j.repeatOfRef ? 0 : j.visitCharge + partsTotal(j));

/** What one job earns the technician, by part. Salary is paid monthly, on top. */
export function payBreakdown(j: Job, s: EarningSchedule = PAY) {
  // A job that came back as a repeat earns nothing, and neither does fixing your own repeat.
  if (j.repeatedByRef || j.repeatSelf) return { service: 0, parts: 0, travel: 0, travelKm: 0, total: 0 };
  const commission = s.pay_basis !== "Salary";
  const service = !commission ? 0 : !j.visitCharge ? s.free_job_fee
    : s.service_mode === "Percent" ? (j.visitCharge * s.service_value) / 100 : s.service_value;
  const units = j.parts.reduce((n, p) => n + p.qty, 0);
  const parts = !commission ? 0 : s.parts_mode === "Percent" ? (partsTotal(j) * s.parts_value) / 100 : units * s.parts_value;
  const km = j.customer.distanceKm ?? 0;
  const travelKm = km * (s.round_trip ? 2 : 1);
  const travel = travelKm * s.km_rate;
  return { service: Math.round(service), parts: Math.round(parts), travel: Math.round(travel), travelKm, total: Math.round(service + parts + travel) };
}

export const jobPayout = (j: Job) => payBreakdown(j).total;

/** "60% of the visit charge" / "₹150 per job" — for explaining a schedule. */
export function describeSchedule(s: EarningSchedule) {
  const bits: string[] = [];
  if (s.pay_basis !== "Commission") bits.push(`₹${s.monthly_salary.toLocaleString("en-IN")} monthly salary`);
  if (s.pay_basis !== "Salary") {
    bits.push(s.service_mode === "Percent" ? `${s.service_value}% of the visit charge` : `₹${s.service_value} per job`);
    if (s.free_job_fee) bits.push(`₹${s.free_job_fee} for free installs & AMC visits`);
    if (s.parts_value) bits.push(s.parts_mode === "Percent" ? `${s.parts_value}% on parts` : `₹${s.parts_value} per part fitted`);
  }
  if (Number(s.km_rate)) bits.push(`₹${Number(s.km_rate)}/km travel${s.round_trip ? " (both ways)" : ""}`);
  return bits.length ? bits.join(" · ") : "No pay set";
}
