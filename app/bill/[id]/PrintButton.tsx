"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} style={{ border: "1.5px solid var(--line-strong)", background: "var(--surface)", color: "var(--ink)", borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      Download / Print
    </button>
  );
}
