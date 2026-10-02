/* Shared shapes and the built-in starting catalogue.
 *
 * Live data comes from Supabase (see lib/catalog.ts and lib/db.ts). PRODUCTS,
 * SERVICE_CATALOG, COUPONS and TECHNICIANS are filled with live rows in the
 * browser; the values below match the database seed so server-rendered pages
 * (the storefront) work before anything loads. No sample customers, orders,
 * jobs or reviews live here any more. */

/* Unique IDs — one series per role so an ID alone says who it is:
 * CUS-100101 (customer), TEC-200101 (technician), DLR-300101 (dealer). */
export const ID_PREFIX = { customer: "CUS", technician: "TEC", dealer: "DLR" } as const;
const ID_BASE = { customer: 100100, technician: 200100, dealer: 300100 } as const;
export const makeId = (role: keyof typeof ID_PREFIX, n: number) => `${ID_PREFIX[role]}-${ID_BASE[role] + n}`;

/** Localities for the pincodes Zavtoo serves today — used as labels and suggestions. */
export const PIN_AREAS: Record<string, string> = {
  "201301": "Noida Sec 1–39", "201303": "Noida Sec 40–50", "201304": "Greater Noida", "201307": "Noida Sec 100+",
  "201309": "Noida Sec 62–63", "201010": "Ghaziabad", "201014": "Indirapuram", "122001": "Gurugram City",
  "122002": "DLF Cyber City", "122003": "Sohna Road", "122018": "Gurugram Sec 56",
};

/** Indian pincode: 6 digits, can't start with 0. */
export const isPincode = (p: string) => /^[1-9]\d{5}$/.test(p);

export type Category = "domestic" | "commercial" | "spare";
export type ArtKind = "classic" | "pro" | "premium" | "commercial" | "spare" | "cartridge";

export interface Product {
  id: string;
  name: string;
  spec: string;
  price: number;
  mrp: number;
  category: Category;
  art: ArtKind;
  rating: number;
  reviews: number;
  stages: string;
  warranty: string;
  description: string;
  /** null = not tracked. */
  stock?: number | null;
  active?: boolean;
}

export const PRODUCTS: Product[] = [
  {
    id: "classic", name: "AquaPure RO Classic", spec: "7 Stage Purification",
    price: 12999, mrp: 15999, category: "domestic", art: "classic",
    rating: 4.5, reviews: 124, stages: "7 Stage", warranty: "1 Year",
    description: "Best for home use. Removes 99.9% bacteria, viruses and harmful impurities. Elegant design with smart indicators for filter life and tank level.",
  },
  {
    id: "pro", name: "AquaPure RO Pro", spec: "8 Stage + UV",
    price: 18999, mrp: 22499, category: "domestic", art: "pro",
    rating: 4.6, reviews: 86, stages: "8 Stage", warranty: "2 Years",
    description: "RO + UV + UF with a mineral cartridge that puts back calcium and magnesium. 10 L storage tank for families of 4–6.",
  },
  {
    id: "premium", name: "AquaPure RO Premium", spec: "Smart Display | WiFi",
    price: 24999, mrp: 29999, category: "domestic", art: "premium",
    rating: 4.7, reviews: 52, stages: "9 Stage", warranty: "3 Years",
    description: "Touch display shows live TDS, filter health and daily usage. WiFi alerts on your phone when a filter change is due.",
  },
  {
    id: "commercial-50", name: "Zavtoo Commercial 50 LPH", spec: "For offices & shops",
    price: 42999, mrp: 49999, category: "commercial", art: "commercial",
    rating: 4.4, reviews: 31, stages: "6 Stage", warranty: "1 Year",
    description: "Stainless-steel frame, 50 litres per hour output. Built for offices, clinics and small restaurants.",
  },
  {
    id: "commercial-100", name: "Zavtoo Commercial 100 LPH", spec: "Schools & factories",
    price: 68999, mrp: 79999, category: "commercial", art: "commercial",
    rating: 4.5, reviews: 18, stages: "6 Stage", warranty: "1 Year",
    description: "Heavy-duty 100 LPH plant with auto-flush and dual pressure pumps for continuous use.",
  },
  {
    id: "spares", name: "Spare Parts Kit", spec: "Sediment + Carbon + Membrane",
    price: 499, mrp: 699, category: "spare", art: "spare",
    rating: 4.3, reviews: 210, stages: "3 filters", warranty: "6 Months",
    description: "Genuine replacement filters for AquaPure RO Classic and Pro. Change every 6–9 months for best taste.",
  },
  {
    id: "cartridges", name: "Filter Cartridges", spec: "Pack of 3 · universal fit",
    price: 1299, mrp: 1599, category: "spare", art: "cartridge",
    rating: 4.2, reviews: 97, stages: "3 cartridges", warranty: "6 Months",
    description: "Universal-fit inline cartridges for most domestic RO purifiers.",
  },
];

export const productById = (id: string) => PRODUCTS.find((p) => p.id === id);

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export type OrderStatus = "Delivered" | "Shipped" | "Placed" | "Completed" | "In Progress" | "Requested" | "Cancelled" | "Rescheduled";

export interface OrderItem { id: string; name: string; qty: number; price: number; mrp: number; art?: ArtKind }

export interface Order {
  id: string;
  /** Human reference shown to people, e.g. ZVT1042 / SRV1017. */
  ref: string;
  kind: "product" | "service";
  title: string;
  art: ArtKind;
  amount: number;
  date: string;
  status: OrderStatus;
  /** Service orders link to their tracker. */
  serviceId?: string;
  /** Products in the order — used for "Rate & review" once delivered. */
  productIds?: string[];
  coupon?: string;
  discount?: number;
  walletUsed?: number;
  items?: OrderItem[];
  payment?: string;
  paymentStatus?: string;
  address?: string;
  createdAt?: string;
}

export interface TimelineStep {
  label: string;
  at: string | null;
}

export type ServiceType = "Installation" | "Repair" | "AMC" | "Filter Change" | "Water Test" | "Uninstall";

export interface ServiceRating {
  stars: number;
  tags: string[];
  comment: string;
}

/** Job status as stored in the database. */
export type JobState = "Requested" | "With ops" | "Assigned" | "On the way" | "Arrived" | "In Progress" | "Completed" | "Rescheduled" | "Cancelled";

export interface ServiceRequest {
  id: string;
  ref: string;
  status: JobState;
  type: ServiceType;
  product: string;
  date: string;
  slot: string;
  description: string;
  /** Index into the timeline of the step currently running. */
  current: number;
  timeline: TimelineStep[];
  technician: { id: string; code: string; name: string; initials: string; rating: number; phone: string } | null;
  /** Technician the customer picked, while they haven't accepted yet. */
  preferredTechId?: string | null;
  pincode?: string;
  lat?: number | null;
  lng?: number | null;
  tripStartedAt?: string | null;
  etaMin?: number | null;
  distanceKm?: number | null;
  price?: number;
  discount?: number;
  amount?: number;
  rescheduleReason?: string | null;
  rating?: ServiceRating;
  /** Start code the customer gives the technician on arrival. */
  otp?: string;
  /** Where the technician is headed. */
  address?: string;
  /** Photos of the purifier — paths in the private "ro-photos" storage bucket. */
  photos?: string[];
}

export const SERVICE_STEPS = ["Service Requested", "Technician Assigned", "In Progress", "Completed", "Feedback"];

export interface ChatMessage {
  id: string;
  from: "me" | "agent";
  body: string;
  /** Storage path of an attached photo (shown through a signed URL). */
  image?: string;
  at: string;
}

export interface UserProfile {
  /** Unique customer ID, e.g. CUS-100101. */
  id: string;
  /** Auth user id. */
  uid?: string;
  name: string;
  email: string;
  phone: string;
  gender: "" | "Male" | "Female" | "Other";
  dob: string;
}

export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";

export const TIME_SLOTS = ["08:00 – 10:00 AM", "10:00 AM – 12:00 PM", "12:00 – 02:00 PM", "02:00 – 04:00 PM", "04:00 – 06:00 PM"];

export const nowTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "26 Sep 2026" — spelled out by hand because en-GB now prints "Sept". */
export const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const todayLabel = () => fmtDate(new Date());

/* ───────────── Addresses ───────────── */

export interface Address {
  id: string;
  label: "Home" | "Office" | "Other";
  line: string;
  pincode: string;
  isDefault: boolean;
  lat?: number | null;
  lng?: number | null;
}

/* ───────────── Offers / coupons ───────────── */

export interface Coupon {
  code: string;
  title: string;
  desc: string;
  kind: "flat" | "percent";
  value: number;
  /** Cap for percent coupons. */
  maxOff?: number;
  minOrder: number;
  appliesTo: "product" | "service" | "all";
  expires: string;
  active?: boolean;
  used?: number;
}

export const COUPONS: Coupon[] = [
  { code: "PURE10", title: "10% off purifiers", desc: "Up to ₹2,000 off on any RO purifier order.", kind: "percent", value: 10, maxOff: 2000, minOrder: 9999, appliesTo: "product", expires: "31 Oct 2026" },
  { code: "FILTER150", title: "₹150 off spares", desc: "Flat ₹150 off on filters & cartridges above ₹999.", kind: "flat", value: 150, minOrder: 999, appliesTo: "product", expires: "15 Oct 2026" },
  { code: "FIRSTFIX", title: "₹200 off first repair", desc: "Flat ₹200 off your repair visit charge.", kind: "flat", value: 200, minOrder: 399, appliesTo: "service", expires: "30 Nov 2026" },
  { code: "AMC300", title: "₹300 off AMC", desc: "Save ₹300 when you buy or renew a 1-year AMC.", kind: "flat", value: 300, minOrder: 1999, appliesTo: "service", expires: "31 Dec 2026" },
  { code: "ZAVTOO5", title: "5% off everything", desc: "Works on products and paid services. Max ₹500.", kind: "percent", value: 5, maxOff: 500, minOrder: 499, appliesTo: "all", expires: "31 Dec 2026" },
];

export const couponByCode = (code: string) => COUPONS.find((c) => c.code === code.trim().toUpperCase());

/** Why a coupon can't be used right now, or null if it can. */
export function couponError(c: Coupon, amount: number, on: "product" | "service"): string | null {
  if (c.appliesTo !== "all" && c.appliesTo !== on) return `Valid on ${c.appliesTo === "product" ? "product orders" : "service bookings"} only`;
  if (amount < c.minOrder) return `Add ${inr(c.minOrder - amount)} more to use this`;
  return null;
}

export function couponDiscount(c: Coupon, amount: number) {
  const off = c.kind === "flat" ? c.value : Math.round((amount * c.value) / 100);
  return Math.min(amount, c.maxOff ? Math.min(off, c.maxOff) : off);
}

/* ───────────── Wallet ───────────── */

export interface WalletTxn {
  id: string;
  title: string;
  /** Positive = credit, negative = debit. */
  amount: number;
  at: string;
}

/* ───────────── Referral ───────────── */

export const REFERRAL_REWARD = 250;

export interface Referral {
  name: string;
  status: "Joined" | "Purchased";
  at: string;
}

/* ───────────── Notifications ───────────── */

export type NotifKind = "order" | "service" | "offer" | "wallet";

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Where tapping it goes. */
  link?: { k: "order"; id: string } | { k: "track"; id: string } | { k: "offers" } | { k: "wallet" } | null;
}

export interface NotifPrefs {
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
  offers: boolean;
}

/* ───────────── Reviews & technicians ───────────── */

export interface Review {
  id: string;
  /** Either a product id or a technician id. */
  productId?: string;
  techId?: string;
  author: string;
  stars: number;
  body: string;
  date: string;
  mine?: boolean;
}

export interface Technician {
  id: string;
  /** Unique technician ID shown to customers, ops and dealers. */
  code: string;
  name: string;
  initials: string;
  rating: number;
  jobs: number;
  years: number;
  skills: string[];
  languages: string;
  phone: string;
  /** Pincodes they cover — the first one is their primary area. */
  pincodes: string[];
  /** Dealer the technician works under. */
  dealerId: string;
  photoUrl?: string;
}

/** Verified technicians — filled from the database (needs a login to read). */
export const TECHNICIANS: Technician[] = [];

/** Technicians who serve a pincode — those whose primary area it is first, then by rating. */
export const servicePincodes = (t: Technician, overrides: Record<string, string[]> = {}) =>
  overrides[t.id]?.length ? overrides[t.id] : t.pincodes;

export function techsForPincode(pin: string, poolOrOverrides: Technician[] | Record<string, string[]> = TECHNICIANS, legacyPool: Technician[] = TECHNICIANS) {
  const pool = Array.isArray(poolOrOverrides) ? poolOrOverrides : legacyPool;
  const overrides = Array.isArray(poolOrOverrides) ? {} : poolOrOverrides;
  return pool
    .map((t) => ({ t, pins: servicePincodes(t, overrides) }))
    .filter(({ pins }) => pins.includes(pin))
    .sort((a, b) => Number(b.pins[0] === pin) - Number(a.pins[0] === pin) || b.t.rating - a.t.rating)
    .map(({ t, pins }) => ({ tech: t, primary: pins[0] === pin }));
}

export const techById = (id: string) => TECHNICIANS.find((t) => t.id === id);

export const RATING_TAGS = ["On time", "Polite", "Explained the issue", "Clean work", "Fair pricing", "Fixed first time"];

/* ───────────── Service catalogue ───────────── */

export interface ServiceOffering {
  type: ServiceType;
  tagline: string;
  price: number;
  /** Shown next to the price, e.g. "visit charge". */
  priceNote: string;
  duration: string;
  includes: string[];
  /** Marketing placeholders for the storefront; the live catalogue sets 0 / "". */
  rating: number;
  bookings: string;
  active?: boolean;
}

export const SERVICE_CATALOG: ServiceOffering[] = [
  { type: "Installation", tagline: "Free with every Zavtoo purifier", price: 0, priceNote: "for Zavtoo purifiers", duration: "45–60 min",
    includes: ["Wall mounting & plumbing", "Inlet valve + drain setup", "TDS check before and after", "Demo of filter indicators"], rating: 4.8, bookings: "12k+" },
  { type: "Repair", tagline: "Leaks, low flow, noise, bad taste", price: 499, priceNote: "visit charge · parts extra", duration: "30–90 min",
    includes: ["Full diagnosis of the purifier", "Leak & pressure checks", "Genuine spare parts at MRP", "30-day repair warranty"], rating: 4.7, bookings: "8k+" },
  { type: "AMC", tagline: "1 year of worry-free water", price: 1999, priceNote: "per year", duration: "1 year cover",
    includes: ["3 preventive service visits", "2 filter sets included", "Priority repairs within 24h", "No visit charges all year"], rating: 4.9, bookings: "5k+" },
  { type: "Filter Change", tagline: "Sediment, carbon & membrane", price: 899, priceNote: "incl. filter kit", duration: "30 min",
    includes: ["Genuine sediment + carbon filters", "Membrane health check", "Tank sanitisation", "TDS reading after service"], rating: 4.6, bookings: "6k+" },
  { type: "Water Test", tagline: "Know what's in your water", price: 199, priceNote: "at-home test", duration: "20 min",
    includes: ["TDS, pH and hardness test", "Chlorine check", "Purifier recommendation", "Digital report on SMS"], rating: 4.5, bookings: "3k+" },
  { type: "Uninstall", tagline: "Moving house? We'll handle it", price: 349, priceNote: "uninstall + reinstall ₹599", duration: "30 min",
    includes: ["Safe dismounting", "Pipe & valve capping", "Packing guidance", "Reinstall at new address on request"], rating: 4.6, bookings: "2k+" },
];

export const offeringOf = (t: ServiceType) => SERVICE_CATALOG.find((s) => s.type === t)!;

/** Empty initial state for screens that have not yet switched to live queries.
 * Keep these exports during the migration; never seed another customer's data.
 */
export const INITIAL_ADDRESSES: Address[] = [];
export const INITIAL_CHAT: ChatMessage[] = [];
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_REFERRALS: Referral[] = [];
export const INITIAL_REVIEWS: Review[] = [];
export const INITIAL_SERVICES: ServiceRequest[] = [];
export const INITIAL_WALLET: WalletTxn[] = [];
export const USER: UserProfile = { id: "", name: "", email: "", phone: "", gender: "", dob: "" };
