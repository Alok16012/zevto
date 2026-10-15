import Link from "next/link";

export function PrivacyLinks() {
  return (
    <nav aria-label="Privacy and account controls" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", padding: "16px 0", fontSize: 12, color: "var(--blue)" }}>
      <Link href="/privacy-policy">Privacy policy</Link>
      <Link href="/terms-and-condition">Terms &amp; conditions</Link>
      <Link href="/delete-account">Delete account</Link>
    </nav>
  );
}
