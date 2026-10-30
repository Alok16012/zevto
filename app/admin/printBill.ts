import { COMPANY } from "../storefront/content";
import { fmtDay } from "../lib/catalog";
import { inr } from "../lib/data";

/* Printable purchase / sale bill. Opens in a new tab and shows the print dialog,
 * where "Save as PDF" gives the PDF — no PDF library needed. */

export interface PrintParty { code: string; type: string; name: string; contact: string; phone: string; email: string; gstin: string; address: string; city: string; state: string }
export interface PrintBill {
  ref: string; kind: "Purchase" | "Sale"; bill_no: string; bill_date: string; items: { name: string; qty: number; rate: number }[];
  subtotal: number; tax: number; total: number; notes: string; status: "Posted" | "Cancelled"; cancel_reason: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const twoDigits = (n: number) => n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
const threeDigits = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "", twoDigits(n % 100)].filter(Boolean).join(" ");
/** 125430 → "One Lakh Twenty Five Thousand Four Hundred Thirty" (Indian numbering). */
export function rupeesInWords(amount: number) {
  let n = Math.round(Math.abs(amount));
  if (!n) return "Zero";
  const parts: string[] = [];
  for (const [size, label] of [[1e7, "Crore"], [1e5, "Lakh"], [1e3, "Thousand"]] as const) {
    if (n >= size) { parts.push(`${size === 1e7 ? rupeesInWords(Math.floor(n / size)) : twoDigits(Math.floor(n / size))} ${label}`); n %= size; }
  }
  if (n) parts.push(threeDigits(n));
  return parts.join(" ");
}

export function printBill(bill: PrintBill, party: PrintParty | undefined) {
  const win = window.open("", "_blank");
  if (!win) { alert("Allow pop-ups for this site to print the bill."); return; }
  const sale = bill.kind === "Sale";
  const us = `<strong>${esc(COMPANY.name)}</strong><br>${esc(COMPANY.address)}<br>Phone ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}${COMPANY.gstin ? `<br>GSTIN ${esc(COMPANY.gstin)}` : ""}`;
  const them = party
    ? `<strong>${esc(party.name)}</strong> <span class="muted">(${esc(party.type)} · ${esc(party.code)})</span>${party.contact ? `<br>${esc(party.contact)}` : ""}${party.address ? `<br>${esc(party.address)}` : ""}${party.city || party.state ? `<br>${esc([party.city, party.state].filter(Boolean).join(", "))}` : ""}${party.phone ? `<br>Phone ${esc(party.phone)}` : ""}${party.gstin ? `<br>GSTIN ${esc(party.gstin)}` : ""}`
    : "—";
  const rows = bill.items.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.name)}</td><td class="r">${l.qty}</td><td class="r">${inr(l.rate)}</td><td class="r">${inr(l.qty * l.rate)}</td></tr>`).join("");
  const qty = bill.items.reduce((n, l) => n + l.qty, 0);

  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(bill.ref)} · ${esc(party?.name ?? "")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font: 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c1c1e; margin: 0; padding: 24px; }
  .sheet { max-width: 800px; margin: 0 auto; position: relative; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #0b5394; padding-bottom: 14px; }
  .brand { display: block; height: 52px; width: auto; }
  h1 { margin: 0; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; color: #0b5394; text-align: right; }
  .meta { text-align: right; margin-top: 6px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0; }
  .box h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #6b6f76; }
  .muted { color: #6b6f76; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f1f4f8; text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e3e6ea; }
  .r { text-align: right; }
  .totals { margin-left: auto; width: 300px; margin-top: 12px; }
  .totals td { border: 0; padding: 4px 10px; }
  .totals .grand td { border-top: 2px solid #1c1c1e; font-size: 16px; font-weight: 700; padding-top: 8px; }
  .words { margin-top: 12px; padding: 10px 12px; background: #f6f7f9; border-radius: 6px; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; }
  .sign { text-align: center; border-top: 1px solid #1c1c1e; padding-top: 6px; width: 220px; }
  .stamp { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); font-size: 84px; font-weight: 800; color: rgba(179, 38, 30, .16); border: 8px solid rgba(179, 38, 30, .16); padding: 0 24px; pointer-events: none; }
  .bar { text-align: center; margin-bottom: 16px; }
  .bar button { font: inherit; padding: 9px 18px; border-radius: 8px; border: 0; background: #0b5394; color: #fff; cursor: pointer; }
  @media print { body { padding: 0; } .bar { display: none; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
  ${bill.status === "Cancelled" ? `<div class="stamp">CANCELLED</div>` : ""}
  <header>
    <div><img class="brand" src="${location.origin}/brand/zavtoo-logo.png" alt="Zavtoo Paani Filter Pvt Ltd"><div style="margin-top:8px">${us}</div></div>
    <div><h1>${sale ? "Sale Invoice" : "Purchase Bill"}</h1>
      <div class="meta"><strong>${esc(bill.ref)}</strong><br>Date: ${esc(fmtDay(bill.bill_date))}${bill.bill_no ? `<br>${sale ? "Invoice" : "Supplier bill"} no.: ${esc(bill.bill_no)}` : ""}</div></div>
  </header>
  <div class="cols">
    <div class="box"><h2>${sale ? "Bill to" : "Supplier"}</h2>${them}</div>
    <div class="box"><h2>${sale ? "Sold by" : "Bought by"}</h2>${us}</div>
  </div>
  <table>
    <thead><tr><th style="width:40px">#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal (${qty} pcs)</td><td class="r">${inr(bill.subtotal)}</td></tr>
    <tr><td>Tax / GST</td><td class="r">${inr(bill.tax)}</td></tr>
    <tr class="grand"><td>Total</td><td class="r">${inr(bill.total)}</td></tr>
  </table>
  <div class="words"><strong>Amount in words:</strong> Rupees ${rupeesInWords(bill.total)} only</div>
  ${bill.notes ? `<p><strong>Notes:</strong> ${esc(bill.notes)}</p>` : ""}
  ${bill.status === "Cancelled" ? `<p style="color:#b3261e"><strong>This bill was cancelled.</strong>${bill.cancel_reason ? ` Reason: ${esc(bill.cancel_reason)}` : ""}</p>` : ""}
  <div class="foot"><span class="muted">Computer-generated ${sale ? "invoice" : "bill"} · ${esc(COMPANY.website)}</span><div class="sign">For ${esc(COMPANY.name)}<br><span class="muted">Authorised signatory</span></div></div>
</div>
<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`);
  win.document.close();
}
