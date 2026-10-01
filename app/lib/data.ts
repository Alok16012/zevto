/* Sample catalogue, orders and service jobs. Stand-ins until the Node.js API
 * from the PRD is live — every screen reads through these shapes. */

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

export type OrderStatus = "Delivered" | "Shipped" | "Placed" | "Completed" | "In Progress" | "Requested";

export interface Order {
  id: string;
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

export interface ServiceRequest {
  id: string;
  type: ServiceType;
  product: string;
  date: string;
  slot: string;
  description: string;
  /** Index into the timeline of the step currently running. */
  current: number;
  timeline: TimelineStep[];
  technician: { id: string; name: string; initials: string; rating: number; phone: string } | null;
  rating?: ServiceRating;
  /** Start code the customer gives the technician on arrival. */
  otp?: string;
  /** Where the technician is headed. */
  address?: string;
  /** Photos of the purifier the customer attached (JPEG data URLs). */
  photos?: string[];
}

export const SERVICE_STEPS = ["Service Requested", "Technician Assigned", "In Progress", "Completed", "Feedback"];

export const INITIAL_SERVICES: ServiceRequest[] = [
  {
    id: "SRV1041",
    type: "Repair",
    product: "AquaPure RO Classic",
    date: "26 Sep 2026",
    slot: "10:00 AM – 12:00 PM",
    description: "Water flow is very slow and the tank is not filling.",
    current: 2,
    timeline: [
      { label: "Service Requested", at: "26 Sep 2026, 09:15 AM" },
      { label: "Technician Assigned", at: "26 Sep 2026, 10:30 AM" },
      { label: "In Progress", at: "26 Sep 2026, 12:40 PM" },
      { label: "Completed", at: null },
      { label: "Feedback", at: null },
    ],
    technician: { id: "t1", name: "Rohit Kumar", initials: "RK", rating: 4.8, phone: "+919800000000" },
  },
];

export const INITIAL_ORDERS: Order[] = [
  { id: "ZVT1234", kind: "product", title: "AquaPure RO Classic", art: "classic", amount: 12999, date: "18 Sep 2026", status: "Delivered", productIds: ["classic"] },
  { id: "ZVT1233", kind: "service", title: "Service Booking · Repair", art: "spare", amount: 499, date: "26 Sep 2026", status: "In Progress", serviceId: "SRV1041" },
  { id: "ZVT1232", kind: "product", title: "Filter Cartridges", art: "cartridge", amount: 1299, date: "05 Sep 2026", status: "Shipped", productIds: ["cartridges"] },
];

export interface ChatMessage {
  id: number;
  from: "me" | "agent";
  body: string;
  /** Attached photo, as a data URL. */
  image?: string;
  at: string;
}

export const INITIAL_CHAT: ChatMessage[] = [
  { id: 1, from: "agent", body: "Hello! How can we help you today?", at: "10:24 AM" },
  { id: 2, from: "me", body: "I need help with my purifier, it's not working properly.", at: "10:26 AM" },
  { id: 3, from: "agent", body: "Please share your order number or registered mobile number.", at: "10:27 AM" },
  { id: 4, from: "me", body: "My order number is ZVT1234", at: "10:28 AM" },
  { id: 5, from: "agent", body: "Thanks! Our technician will contact you shortly.", at: "10:28 AM" },
];

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  gender: "" | "Male" | "Female" | "Other";
  dob: string;
}

export const USER: UserProfile = { name: "Alok Kumar", email: "alok@gmail.com", phone: "+91 98XXX XX210", gender: "Male", dob: "" };

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
}

export const INITIAL_ADDRESSES: Address[] = [
  { id: "a1", label: "Home", line: "B-42, Sector 62, Noida, Uttar Pradesh", pincode: "201309", isDefault: true },
  { id: "a2", label: "Office", line: "4th Floor, Tower C, Cyber City, Gurugram, Haryana", pincode: "122002", isDefault: false },
];

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

export const INITIAL_WALLET: WalletTxn[] = [
  { id: "w3", title: "Cashback · Order #ZVT1232", amount: 65, at: "05 Sep 2026" },
  { id: "w2", title: "Referral bonus · Priya S.", amount: 250, at: "28 Aug 2026" },
  { id: "w1", title: "Welcome bonus", amount: 100, at: "12 Aug 2026" },
];

/* ───────────── Referral ───────────── */

export const REFERRAL_REWARD = 250;

export interface Referral {
  name: string;
  status: "Joined" | "Purchased";
  at: string;
}

export const INITIAL_REFERRALS: Referral[] = [
  { name: "Priya S.", status: "Purchased", at: "28 Aug 2026" },
  { name: "Mohit R.", status: "Joined", at: "19 Sep 2026" },
];

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
  link?: { k: "order"; id: string } | { k: "track"; id: string } | { k: "offers" } | { k: "wallet" };
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: "n4", kind: "service", title: "Technician on the job", body: "Rohit Kumar has started work on your AquaPure RO Classic.", at: "26 Sep 2026, 12:40 PM", read: false, link: { k: "track", id: "SRV1041" } },
  { id: "n3", kind: "offer", title: "10% off purifiers 💧", body: "Use PURE10 and save up to ₹2,000 this festive season.", at: "25 Sep 2026, 09:00 AM", read: false, link: { k: "offers" } },
  { id: "n2", kind: "service", title: "AMC renewal due", body: "Your AMC for AquaPure RO Classic expires on 10 Oct.", at: "24 Sep 2026, 10:00 AM", read: true },
  { id: "n1", kind: "wallet", title: "₹65 cashback credited", body: "Cashback for order #ZVT1232 is in your Zavtoo wallet.", at: "05 Sep 2026, 06:12 PM", read: true, link: { k: "wallet" } },
];

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

export const INITIAL_REVIEWS: Review[] = [
  { id: "r1", productId: "classic", author: "Neha G.", stars: 5, body: "Taste improved instantly. Installation was done the same day the purifier arrived.", date: "20 Sep 2026" },
  { id: "r2", productId: "classic", author: "Rajesh P.", stars: 4, body: "Good value. Tank indicator is handy, a bit noisy while filling.", date: "11 Sep 2026" },
  { id: "r3", productId: "classic", author: "Sana K.", stars: 5, body: "Our TDS went from 480 to 60. Very happy.", date: "02 Sep 2026" },
  { id: "r4", productId: "pro", author: "Vikram S.", stars: 5, body: "UV + mineral cartridge is worth the extra. Water tastes sweet.", date: "18 Sep 2026" },
  { id: "r5", productId: "pro", author: "Anita M.", stars: 4, body: "Solid build. Delivery took 3 days.", date: "06 Sep 2026" },
  { id: "r6", productId: "premium", author: "Karan J.", stars: 5, body: "The app alerts for filter change are really useful.", date: "15 Sep 2026" },
  { id: "r7", productId: "spares", author: "Deepak T.", stars: 4, body: "Genuine parts, fit perfectly in my Classic.", date: "10 Sep 2026" },
  { id: "r8", productId: "cartridges", author: "Ritu A.", stars: 4, body: "Fit my old Kent purifier without issues.", date: "01 Sep 2026" },
  { id: "r9", productId: "commercial-50", author: "Cafe Brew, Noida", stars: 4, body: "Keeps up with our rush hours easily.", date: "22 Aug 2026" },
  { id: "t1r1", techId: "t1", author: "Meena V.", stars: 5, body: "Polite, on time and explained what was wrong with the membrane.", date: "22 Sep 2026" },
  { id: "t1r2", techId: "t1", author: "Arjun D.", stars: 5, body: "Fixed the leak in 20 minutes. Cleaned up afterwards too.", date: "14 Sep 2026" },
  { id: "t1r3", techId: "t1", author: "Farah Q.", stars: 4, body: "Good work, came 15 minutes late but called ahead.", date: "03 Sep 2026" },
];

export interface Technician {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobs: number;
  years: number;
  skills: string[];
  languages: string;
  phone: string;
}

export const TECHNICIANS: Technician[] = [
  { id: "t1", name: "Rohit Kumar", initials: "RK", rating: 4.8, jobs: 1240, years: 6, skills: ["RO repair", "Installation", "Membrane change", "UV systems"], languages: "Hindi, English", phone: "+919800000000" },
  { id: "t2", name: "Imran Ali", initials: "IA", rating: 4.7, jobs: 860, years: 4, skills: ["Commercial plants", "Installation", "Water testing"], languages: "Hindi, Urdu", phone: "+919800000001" },
  { id: "t3", name: "Suresh Yadav", initials: "SY", rating: 4.9, jobs: 1580, years: 8, skills: ["AMC visits", "Filter change", "Leak repair"], languages: "Hindi, Bhojpuri", phone: "+919800000002" },
];

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
  rating: number;
  bookings: string;
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
