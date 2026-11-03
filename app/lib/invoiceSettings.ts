import { COMPANY } from "../storefront/content";
import { supabaseFor } from "./supabase";

/* Invoice settings (Admin → Invoice Settings): the company profile, look and
 * terms printed on purchase / sale bills. Tables: invoice_settings (one row)
 * and invoice_terms (supabase/invoice-settings-migration.sql). */

export type TermsPosition = "Same Page" | "Second Page";

export interface InvoiceSettings {
  company_name: string; address: string; state: string; phone: string; phone2: string; email: string; website: string; gstin: string;
  bank_name: string; account_name: string; account_no: string; branch: string; ifsc: string; upi_id: string;
  colour: string; terms_position: TermsPosition;
  show_header: boolean; show_footer: boolean; show_logo: boolean; show_bank: boolean; show_qr: boolean; show_signature: boolean;
  logo_url: string; qr_url: string; signature_url: string; header_url: string; footer_url: string;
  default_terms: string | null;
}

export interface InvoiceTerms { id: string; name: string; body: string; updated_at: string }

/** Used until the migration is run, and to fill any gaps. */
export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  company_name: COMPANY.name, address: COMPANY.address, state: "Delhi", phone: COMPANY.phone, phone2: "", email: COMPANY.email, website: COMPANY.website, gstin: COMPANY.gstin,
  bank_name: "", account_name: "", account_no: "", branch: "", ifsc: "", upi_id: "",
  colour: "#0b5394", terms_position: "Same Page",
  show_header: true, show_footer: true, show_logo: true, show_bank: true, show_qr: true, show_signature: true,
  logo_url: "", qr_url: "", signature_url: "", header_url: "", footer_url: "",
  default_terms: null,
};

export const invoiceNotSetUp = "Invoice settings aren't set up yet — run supabase/invoice-settings-migration.sql in Supabase first.";
export const isInvoiceTableMissing = (m: string) => /invoice_(settings|terms)|admin_set_bill_terms|terms_id/.test(m);

/** Settings and terms templates; falls back to the defaults if the tables aren't there yet. */
export async function loadInvoiceSetup(): Promise<{ settings: InvoiceSettings; terms: InvoiceTerms[]; ready: boolean }> {
  const sb = supabaseFor("admin");
  const [s, t] = await Promise.all([
    sb.from("invoice_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("invoice_terms").select("id, name, body, updated_at").order("name"),
  ]);
  if (s.error || t.error) return { settings: DEFAULT_INVOICE_SETTINGS, terms: [], ready: false };
  const row = (s.data ?? {}) as Partial<InvoiceSettings> & { id?: number; updated_at?: string };
  const { id: _id, updated_at: _at, ...rest } = row;
  return { settings: { ...DEFAULT_INVOICE_SETTINGS, ...rest }, terms: (t.data ?? []) as InvoiceTerms[], ready: true };
}
