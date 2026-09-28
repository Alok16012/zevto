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
}

export interface TimelineStep {
  label: string;
  at: string | null;
}

export interface ServiceRequest {
  id: string;
  type: "Installation" | "Repair" | "AMC";
  product: string;
  date: string;
  slot: string;
  description: string;
  /** Index into the timeline of the step currently running. */
  current: number;
  timeline: TimelineStep[];
  technician: { name: string; initials: string; rating: number; phone: string } | null;
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
    technician: { name: "Rohit Kumar", initials: "RK", rating: 4.8, phone: "+919800000000" },
  },
];

export const INITIAL_ORDERS: Order[] = [
  { id: "ZVT1234", kind: "product", title: "AquaPure RO Classic", art: "classic", amount: 12999, date: "18 Sep 2026", status: "Delivered" },
  { id: "ZVT1233", kind: "service", title: "Service Booking · Repair", art: "spare", amount: 499, date: "26 Sep 2026", status: "In Progress", serviceId: "SRV1041" },
  { id: "ZVT1232", kind: "product", title: "Filter Cartridges", art: "cartridge", amount: 1299, date: "05 Sep 2026", status: "Shipped" },
];

export interface ChatMessage {
  id: number;
  from: "me" | "agent";
  body: string;
  at: string;
}

export const INITIAL_CHAT: ChatMessage[] = [
  { id: 1, from: "agent", body: "Hello! How can we help you today?", at: "10:24 AM" },
  { id: 2, from: "me", body: "I need help with my purifier, it's not working properly.", at: "10:26 AM" },
  { id: 3, from: "agent", body: "Please share your order number or registered mobile number.", at: "10:27 AM" },
  { id: 4, from: "me", body: "My order number is ZVT1234", at: "10:28 AM" },
  { id: 5, from: "agent", body: "Thanks! Our technician will contact you shortly.", at: "10:28 AM" },
];

export const USER = { name: "Alok Kumar", email: "alok@gmail.com", phone: "+91 98XXX XX210", initials: "AK" };

export const TIME_SLOTS = ["08:00 – 10:00 AM", "10:00 AM – 12:00 PM", "12:00 – 02:00 PM", "02:00 – 04:00 PM", "04:00 – 06:00 PM"];

export const nowTime = () =>
  new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "26 Sep 2026" — spelled out by hand because en-GB now prints "Sept". */
export const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export const todayLabel = () => fmtDate(new Date());
