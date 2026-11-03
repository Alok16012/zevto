import { COMPANY } from "../storefront/content";
import { fmtDay } from "../lib/catalog";
import { inr } from "../lib/data";
import { DEFAULT_INVOICE_SETTINGS, loadInvoiceSetup, type InvoiceSettings, type InvoiceTerms } from "../lib/invoiceSettings";

/* Printable purchase / sale bill. Opens in a new tab and shows the print dialog,
 * where "Save as PDF" gives the PDF — no PDF library needed. */

export interface PrintParty { code: string; type: string; name: string; contact: string; phone: string; email: string; gstin: string; address: string; city: string; state: string }
export interface PrintBill {
  ref: string; kind: "Purchase" | "Sale"; bill_no: string; bill_date: string; items: { name: string; qty: number; rate: number }[];
  subtotal: number; tax: number; total: number; notes: string; status: "Posted" | "Cancelled"; cancel_reason: string; terms_id?: string | null;
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

/** Opens the bill with the saved invoice settings. `setup` overrides them (the settings page preview). */
export function printBill(bill: PrintBill, party: PrintParty | undefined, setup?: { settings: InvoiceSettings; terms: InvoiceTerms[] }) {
  // Opened before anything async so pop-up blockers allow it.
  const win = window.open("", "_blank");
  if (!win) { alert("Allow pop-ups for this site to print the bill."); return; }
  win.document.write(`<p style="font:14px system-ui;padding:24px">Preparing bill…</p>`);
  void (setup ? Promise.resolve(setup) : loadInvoiceSetup()).then(
    (s) => writeBill(win, bill, party, s.settings, s.terms),
    () => writeBill(win, bill, party, DEFAULT_INVOICE_SETTINGS, []),
  );
}

const lines = (s: string) => esc(s).replace(/\n/g, "<br>");

function writeBill(win: Window, bill: PrintBill, party: PrintParty | undefined, cfg: InvoiceSettings, termsList: InvoiceTerms[]) {
  const sale = bill.kind === "Sale";
  const colour = /^#[0-9a-f]{6}$/i.test(cfg.colour) ? cfg.colour : DEFAULT_INVOICE_SETTINGS.colour;
  const phones = [cfg.phone, cfg.phone2].filter(Boolean).join(" / ");
  const us = `<strong>${esc(cfg.company_name || COMPANY.name)}</strong>${cfg.address ? `<br>${lines(cfg.address)}` : ""}${cfg.state ? `<br>State: ${esc(cfg.state)}` : ""}`
    + `${phones || cfg.email ? `<br>${[phones && `Phone ${esc(phones)}`, esc(cfg.email)].filter(Boolean).join(" · ")}` : ""}${cfg.gstin ? `<br>GSTIN ${esc(cfg.gstin)}` : ""}`;
  const logo = cfg.logo_url || `${location.origin}/brand/zavtoo-logo.png`;
  const bank = cfg.show_bank && (cfg.account_no || cfg.bank_name)
    ? `<div class="box pay"><h2>Bank details</h2>${[
      cfg.account_name && `Name: <strong>${esc(cfg.account_name)}</strong>`, cfg.bank_name && `Bank: ${esc(cfg.bank_name)}`,
      cfg.account_no && `A/c no.: <strong>${esc(cfg.account_no)}</strong>`, cfg.branch && `Branch: ${esc(cfg.branch)}`,
      cfg.ifsc && `IFSC: ${esc(cfg.ifsc)}`, cfg.upi_id && `UPI: ${esc(cfg.upi_id)}`,
    ].filter(Boolean).join("<br>")}</div>` : "";
  const qr = cfg.show_qr && cfg.qr_url ? `<div class="box pay qr"><h2>Scan to pay</h2><img src="${esc(cfg.qr_url)}" alt="Payment QR code">${cfg.upi_id ? `<div class="muted">${esc(cfg.upi_id)}</div>` : ""}</div>` : "";
  const terms = termsList.find((t) => t.id === (bill.terms_id ?? cfg.default_terms));
  const termsHtml = terms?.body.trim() ? `<section class="terms${cfg.terms_position === "Second Page" ? " next" : ""}"><h2>Terms &amp; conditions${terms.name ? ` · ${esc(terms.name)}` : ""}</h2><p>${lines(terms.body.trim())}</p></section>` : "";
  const signName = esc(cfg.company_name || COMPANY.name);
  const them = party
    ? `<strong>${esc(party.name)}</strong> <span class="muted">(${esc(party.type)} · ${esc(party.code)})</span>${party.contact ? `<br>${esc(party.contact)}` : ""}${party.address ? `<br>${esc(party.address)}` : ""}${party.city || party.state ? `<br>${esc([party.city, party.state].filter(Boolean).join(", "))}` : ""}${party.phone ? `<br>Phone ${esc(party.phone)}` : ""}${party.gstin ? `<br>GSTIN ${esc(party.gstin)}` : ""}`
    : "—";
  const rows = bill.items.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.name)}</td><td class="r">${l.qty}</td><td class="r">${inr(l.rate)}</td><td class="r">${inr(l.qty * l.rate)}</td></tr>`).join("");
  const qty = bill.items.reduce((n, l) => n + l.qty, 0);

  win.document.open();
  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(bill.ref)} · ${esc(party?.name ?? "")}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  :root { --c: ${colour}; }
  body { font: 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c1c1e; margin: 0; padding: 24px; }
  .sheet { max-width: 800px; margin: 0 auto; position: relative; }
  .banner { display: block; width: 100%; height: auto; max-height: 140px; object-fit: contain; margin-bottom: 12px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid var(--c); padding-bottom: 14px; }
  .brand { display: block; height: 52px; width: auto; max-width: 220px; object-fit: contain; }
  h1 { margin: 0; font-size: 22px; letter-spacing: .04em; text-transform: uppercase; color: var(--c); text-align: right; }
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
  .pays { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 16px; }
  .pay { border: 1px solid #e3e6ea; border-radius: 8px; padding: 10px 12px; min-width: 220px; }
  .qr { text-align: center; min-width: 0; }
  .qr img { display: block; width: 110px; height: 110px; object-fit: contain; margin: 0 auto 4px; }
  .terms { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e3e6ea; font-size: 12px; }
  .terms h2, .pay h2 { margin: 0 0 6px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--c); }
  .terms p { margin: 0; }
  .terms.next { break-before: page; border-top: 0; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-top: 48px; }
  .sign { text-align: center; border-top: 1px solid #1c1c1e; padding-top: 6px; width: 220px; }
  .sign-img { display: block; max-width: 160px; max-height: 70px; margin: 0 auto 4px; object-fit: contain; }
  .stamp { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-18deg); font-size: 84px; font-weight: 800; color: rgba(179, 38, 30, .16); border: 8px solid rgba(179, 38, 30, .16); padding: 0 24px; pointer-events: none; }
  .bar { text-align: center; margin-bottom: 16px; }
  .bar button { font: inherit; padding: 9px 18px; border-radius: 8px; border: 0; background: var(--c); color: #fff; cursor: pointer; }
  @media print { body { padding: 0; } .bar { display: none; } }
</style></head><body>
<div class="bar"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
  ${bill.status === "Cancelled" ? `<div class="stamp">CANCELLED</div>` : ""}
  ${cfg.show_header && cfg.header_url ? `<img class="banner" src="${esc(cfg.header_url)}" alt="">` : ""}
  <header>
    <div>${cfg.show_logo ? `<img class="brand" src="${esc(logo)}" alt="${esc(cfg.company_name || COMPANY.name)}">` : ""}<div style="margin-top:8px">${us}</div></div>
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
  ${sale && (bank || qr) ? `<div class="pays">${bank}${qr}</div>` : ""}
  ${cfg.terms_position === "Same Page" ? termsHtml : ""}
  <div class="foot"><span class="muted">Computer-generated ${sale ? "invoice" : "bill"}${cfg.website ? ` · ${esc(cfg.website)}` : ""}</span>
    <div>${cfg.show_signature && cfg.signature_url ? `<img class="sign-img" src="${esc(cfg.signature_url)}" alt="Stamp and signature">` : ""}<div class="sign">For ${signName}<br><span class="muted">Authorised signatory</span></div></div></div>
  ${cfg.show_footer && cfg.footer_url ? `<img class="banner" style="margin:18px 0 0" src="${esc(cfg.footer_url)}" alt="">` : ""}
  ${cfg.terms_position === "Second Page" ? termsHtml : ""}
</div>
<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 300); });</script>
</body></html>`);
  win.document.close();
}
