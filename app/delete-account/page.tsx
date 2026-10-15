import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "../storefront/content";

export const metadata: Metadata = {
  title: "Delete your Zavtoo account",
  description: "Request deletion of your Zavtoo customer, technician or dealer account and associated personal data without signing in.",
};
const subject = "Zavtoo account deletion";
const body = "I request deletion of my Zavtoo account and associated personal data.\n\nAccount role (Customer / Technician / Dealer):\nRegistered email or phone number:\n\nPlease explain any records that must be retained and confirm when deletion is complete.";
const emailHref = `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export default function DeleteAccountPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 64px", color: "#172b4d", lineHeight: 1.75, overflowWrap: "anywhere" }}>
      <Link href="/app" style={{ color: "#075be8" }}>← Zavtoo app</Link>
      <p style={{ color: "#526580", marginTop: 28 }}>{COMPANY.name}</p>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)", lineHeight: 1.2 }}>Delete your Zavtoo account</h1>
      <p>You can request deletion of your Customer, Technician or Dealer account and associated personal data. You do not need to sign in or reinstall the app.</p>
      <h2>Send a deletion request</h2>
      <ol>
        <li>Email <a href={emailHref}>{COMPANY.email}</a> with the subject <strong>{subject}</strong>.</li>
        <li>Include your account role and registered email address or phone number. Sending from your registered email helps us verify ownership.</li>
        <li>Our support team may ask you to verify ownership, then explain the expected completion time and confirm the outcome.</li>
      </ol>
      <a href={emailHref} style={{ display: "inline-block", background: "#075be8", color: "white", padding: "12px 20px", borderRadius: 12, textDecoration: "none", fontWeight: 600 }}>Write deletion request email</a>
      <p style={{ fontSize: 14 }}>This opens your email app. You must send the email to submit the request. If no email app opens, copy the address and subject into your email service. Do not include passwords, OTPs, identity documents or payment PINs.</p>
      <h2>What is deleted?</h2>
      <p>Your login account and associated profile, saved addresses, optional profile details, personal uploads and support data that no longer need to be kept. Technician and dealer accounts also require review of listings and operational records.</p>
      <h2>What may be retained?</h2>
      <p>Records needed for orders, invoices, payment settlements, warranties, fraud prevention, disputes or legal obligations may be retained for those purposes. Support will explain any retained categories, reasons and applicable retention periods when handling your request. Backups expire through the provider’s normal backup cycle. Active jobs and settlements may require coordination before completion.</p>
      <h2>Delete specific data</h2>
      <p>You can use the same email to request deletion of particular photos or other personal information while keeping your account. Tell us which data you want removed.</p>
      <p>Uninstalling Zavtoo or logging out does not delete your account. For help, call <a href="tel:+918929029006">+91 8929029006</a>.</p>
      <p><Link href="/privacy-policy">Privacy policy</Link> · <Link href="/contact-us">Contact us</Link></p>
    </main>
  );
}
