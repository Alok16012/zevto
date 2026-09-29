/* Sample data for the admin panel at /admin. Stand-ins until the admin API is
 * live; catalogue, coupons, technicians and reviews reuse the shared data. */

import { COUPONS, INITIAL_REVIEWS, PRODUCTS, TECHNICIANS, type Coupon, type Review, type ServiceType, type Technician } from "./data";

/** Demo credentials — the login screen shows them. */
export const ADMIN_DEMO = { email: "admin@zavtoo.in", password: "zavtoo@demo" };

export const TODAY = "29 Sep 2026";

/* ───────────── Customers ───────────── */

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  joined: string;
  orders: number;
  spent: number;
  wallet: number;
  amc: "Active" | "Expiring" | "None";
  blocked: boolean;
}

export const CUSTOMERS: AdminCustomer[] = [
  { id: "C1001", name: "Alok Kumar", phone: "+91 98XXX XX210", email: "alok@gmail.com", city: "Noida", joined: "12 Aug 2026", orders: 3, spent: 14797, wallet: 415, amc: "Expiring", blocked: false },
  { id: "C1002", name: "Neha Gupta", phone: "+91 97XXX XX118", email: "neha.g@gmail.com", city: "Noida", joined: "03 Sep 2026", orders: 1, spent: 18999, wallet: 100, amc: "Active", blocked: false },
  { id: "C1003", name: "Sana Khan", phone: "+91 99XXX XX402", email: "sana.k@yahoo.com", city: "Noida", joined: "18 Mar 2026", orders: 4, spent: 16296, wallet: 0, amc: "Active", blocked: false },
  { id: "C1004", name: "Rajesh Pandey", phone: "+91 98XXX XX771", email: "rajesh.p@gmail.com", city: "Noida", joined: "22 Jul 2026", orders: 2, spent: 1798, wallet: 250, amc: "None", blocked: false },
  { id: "C1005", name: "Vikram Singh", phone: "+91 96XXX XX035", email: "vikram.s@outlook.com", city: "Ghaziabad", joined: "01 Sep 2026", orders: 1, spent: 18999, wallet: 100, amc: "Active", blocked: false },
  { id: "C1006", name: "Meena Verma", phone: "+91 95XXX XX650", email: "meena.v@gmail.com", city: "Noida", joined: "11 Jan 2026", orders: 5, spent: 20644, wallet: 65, amc: "Active", blocked: false },
  { id: "C1007", name: "Karan Joshi", phone: "+91 98XXX XX909", email: "karan.j@gmail.com", city: "Noida", joined: "14 Sep 2026", orders: 1, spent: 24999, wallet: 0, amc: "Active", blocked: false },
  { id: "C1008", name: "Cafe Brew", phone: "+91 88XXX XX313", email: "orders@cafebrew.in", city: "Noida", joined: "02 Aug 2026", orders: 2, spent: 44298, wallet: 0, amc: "None", blocked: false },
  { id: "C1009", name: "Farah Qureshi", phone: "+91 90XXX XX227", email: "farah.q@gmail.com", city: "Gurugram", joined: "27 Jun 2026", orders: 2, spent: 13498, wallet: 250, amc: "Expiring", blocked: false },
  { id: "C1010", name: "Test Spam", phone: "+91 70XXX XX000", email: "spam123@mail.ru", city: "—", joined: "28 Sep 2026", orders: 0, spent: 0, wallet: 0, amc: "None", blocked: true },
];

/* ───────────── Orders ───────────── */

export type AdminOrderStatus = "Placed" | "Shipped" | "Delivered" | "Cancelled";
export const ORDER_FLOW: AdminOrderStatus[] = ["Placed", "Shipped", "Delivered"];

export interface AdminOrder {
  id: string;
  customerId: string;
  items: string;
  amount: number;
  payment: "UPI" | "Card" | "COD" | "Wallet";
  date: string;
  status: AdminOrderStatus;
}

export const ORDERS: AdminOrder[] = [
  { id: "ZVT1245", customerId: "C1007", items: "AquaPure RO Premium", amount: 24999, payment: "Card", date: TODAY, status: "Placed" },
  { id: "ZVT1244", customerId: "C1004", items: "Spare Parts Kit × 2", amount: 998, payment: "COD", date: TODAY, status: "Placed" },
  { id: "ZVT1243", customerId: "C1001", items: "AquaPure RO Classic", amount: 11284, payment: "UPI", date: TODAY, status: "Placed" },
  { id: "ZVT1240", customerId: "C1008", items: "Zavtoo Commercial 50 LPH", amount: 42999, payment: "Card", date: "28 Sep 2026", status: "Shipped" },
  { id: "ZVT1238", customerId: "C1002", items: "AquaPure RO Pro", amount: 18999, payment: "UPI", date: "27 Sep 2026", status: "Shipped" },
  { id: "ZVT1236", customerId: "C1009", items: "Filter Cartridges", amount: 1299, payment: "Wallet", date: "26 Sep 2026", status: "Delivered" },
  { id: "ZVT1235", customerId: "C1006", items: "Spare Parts Kit", amount: 499, payment: "UPI", date: "24 Sep 2026", status: "Delivered" },
  { id: "ZVT1234", customerId: "C1001", items: "AquaPure RO Classic", amount: 12999, payment: "UPI", date: "18 Sep 2026", status: "Delivered" },
  { id: "ZVT1232", customerId: "C1001", items: "Filter Cartridges", amount: 1299, payment: "UPI", date: "05 Sep 2026", status: "Shipped" },
  { id: "ZVT1229", customerId: "C1005", items: "AquaPure RO Pro", amount: 18999, payment: "Card", date: "01 Sep 2026", status: "Delivered" },
  { id: "ZVT1226", customerId: "C1003", items: "Filter Cartridges", amount: 1299, payment: "COD", date: "29 Aug 2026", status: "Cancelled" },
];

/* ───────────── Service jobs ───────────── */

export type AdminJobStatus = "Unassigned" | "Assigned" | "In Progress" | "Completed" | "Rescheduled" | "Cancelled";

export interface AdminJob {
  id: string;
  customerId: string;
  type: ServiceType;
  product: string;
  date: string;
  slot: string;
  area: string;
  techId: string | null;
  status: AdminJobStatus;
  amount: number;
  rating?: number;
  note?: string;
}

export const JOBS: AdminJob[] = [
  { id: "SRV1060", customerId: "C1009", type: "Repair", product: "AquaPure RO Classic", date: "30 Sep 2026", slot: "10 AM – 12 PM", area: "Gurugram", techId: null, status: "Unassigned", amount: 499 },
  { id: "SRV1059", customerId: "C1005", type: "Installation", product: "AquaPure RO Pro", date: "30 Sep 2026", slot: "12 – 2 PM", area: "Ghaziabad", techId: null, status: "Unassigned", amount: 0 },
  { id: "SRV1058", customerId: "C1007", type: "Repair", product: "AquaPure RO Premium", date: TODAY, slot: "2 – 4 PM", area: "Sector 78", techId: "t1", status: "Assigned", amount: 499 },
  { id: "SRV1047", customerId: "C1003", type: "AMC", product: "AquaPure RO Classic", date: TODAY, slot: "4 – 6 PM", area: "Sector 74", techId: "t1", status: "Assigned", amount: 0 },
  { id: "SRV1046", customerId: "C1002", type: "Installation", product: "AquaPure RO Pro", date: TODAY, slot: "12 – 2 PM", area: "Sector 51", techId: "t1", status: "Rescheduled", amount: 0, note: "Customer not available" },
  { id: "SRV1041", customerId: "C1001", type: "Repair", product: "AquaPure RO Classic", date: TODAY, slot: "10 AM – 12 PM", area: "Sector 62", techId: "t1", status: "In Progress", amount: 499 },
  { id: "SRV1044", customerId: "C1008", type: "Filter Change", product: "Commercial 50 LPH", date: TODAY, slot: "8 – 10 AM", area: "Sector 18", techId: "t2", status: "In Progress", amount: 899 },
  { id: "SRV1038", customerId: "C1006", type: "Repair", product: "AquaPure RO Pro", date: TODAY, slot: "8 – 10 AM", area: "Sector 41", techId: "t1", status: "Completed", amount: 1319, rating: 5 },
  { id: "SRV1035", customerId: "C1004", type: "Water Test", product: "Other brand", date: "28 Sep 2026", slot: "10 AM – 12 PM", area: "Sector 27", techId: "t3", status: "Completed", amount: 199, rating: 4 },
  { id: "SRV1031", customerId: "C1003", type: "AMC", product: "AquaPure RO Classic", date: "27 Sep 2026", slot: "4 – 6 PM", area: "Sector 74", techId: "t3", status: "Completed", amount: 1999, rating: 5 },
];

/* ───────────── Technicians ───────────── */

export interface AdminTech extends Technician {
  status: "Online" | "Offline" | "On job";
  area: string;
  kyc: "Verified" | "Pending";
  active: boolean;
}

export const ADMIN_TECHS: AdminTech[] = [
  { ...TECHNICIANS[0], status: "On job", area: "Noida", kyc: "Verified", active: true },
  { ...TECHNICIANS[1], status: "On job", area: "Noida", kyc: "Verified", active: true },
  { ...TECHNICIANS[2], status: "Online", area: "Noida · Ghaziabad", kyc: "Verified", active: true },
  { id: "t4", name: "Deepak Sharma", initials: "DS", rating: 4.6, jobs: 410, years: 3, skills: ["Installation", "Repair"], languages: "Hindi", phone: "+919800000003", status: "Offline", area: "Gurugram", kyc: "Verified", active: true },
  { id: "t5", name: "Amit Rawat", initials: "AR", rating: 0, jobs: 0, years: 2, skills: ["Repair", "Filter change"], languages: "Hindi, English", phone: "+919800000004", status: "Offline", area: "Gurugram", kyc: "Pending", active: false },
];

/* ───────────── Catalogue, coupons, reviews ───────────── */

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  active: boolean;
}

const STOCK: Record<string, number> = { classic: 42, pro: 18, premium: 6, "commercial-50": 4, "commercial-100": 0, spares: 120, cartridges: 64 };

export const ADMIN_PRODUCTS: AdminProduct[] = PRODUCTS.map((p) => ({
  id: p.id, name: p.name, category: p.category, price: p.price, mrp: p.mrp, stock: STOCK[p.id] ?? 0, active: true,
}));

export interface AdminCoupon extends Coupon {
  active: boolean;
  used: number;
}

export const ADMIN_COUPONS: AdminCoupon[] = COUPONS.map((c, i) => ({ ...c, active: true, used: [214, 96, 58, 33, 141][i] ?? 0 }));

export interface AdminReview extends Review {
  status: "Published" | "Hidden" | "Flagged";
}

export const ADMIN_REVIEWS: AdminReview[] = [
  { id: "rf1", productId: "pro", author: "Unknown", stars: 1, body: "Worst purifier!!! Buy from XYZ-water dot com instead, cheaper!!!", date: "28 Sep 2026", status: "Flagged" },
  ...INITIAL_REVIEWS.map((r) => ({ ...r, status: "Published" as const })),
];

/* ───────────── Reporting ───────────── */

/** Revenue (₹) for the 14 days ending today. */
export const REVENUE_14D = [
  { d: "16", v: 38400 }, { d: "17", v: 52100 }, { d: "18", v: 61200 }, { d: "19", v: 29800 }, { d: "20", v: 44700 },
  { d: "21", v: 71300 }, { d: "22", v: 35200 }, { d: "23", v: 48900 }, { d: "24", v: 40100 }, { d: "25", v: 66800 },
  { d: "26", v: 58300 }, { d: "27", v: 49600 }, { d: "28", v: 81200 }, { d: "29", v: 37281 },
];

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: string;
  channels: string[];
  sentAt: string;
  reach: number;
}

export const BROADCASTS: Broadcast[] = [
  { id: "b2", title: "10% off purifiers 💧", body: "Use PURE10 and save up to ₹2,000 this festive season.", audience: "All customers", channels: ["Push", "WhatsApp"], sentAt: "25 Sep 2026, 09:00 AM", reach: 4820 },
  { id: "b1", title: "Time for a filter change?", body: "Book a filter change for ₹899, genuine parts included.", audience: "No AMC", channels: ["Push", "SMS"], sentAt: "15 Sep 2026, 11:00 AM", reach: 2210 },
];

export const AUDIENCES: Record<string, number> = { "All customers": 4820, "AMC active": 1630, "AMC expiring": 214, "No AMC": 2210, "Technicians": 42 };
