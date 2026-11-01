"use client";

import { PageHeader, PrimaryButton, card } from "../ui";
import { Badge, Empty, sectionH } from "./kit";
import { inr } from "../../lib/data";
import { fmtStamp } from "../../lib/db";
import type { DbDealerPurchase, PurchaseStatus } from "../../lib/techShop";

/* Dealer Shop: buy spares, products and POP material from Zavtoo. Delivered
 * spares land in the dealer's Listings (paused) ready to price and sell. */

const TONE: Record<PurchaseStatus, "amber" | "green" | "red" | "grey"> = { Pending: "amber", Delivered: "green", Rejected: "red", Cancelled: "grey" };
const LABEL: Record<PurchaseStatus, string> = { Pending: "With Zavtoo", Delivered: "Delivered", Rejected: "Rejected", Cancelled: "Cancelled" };

export function DealerShopScreen({ purchases, verified, onBuy, onCancel }: {
  purchases: DbDealerPurchase[]; verified: boolean; onBuy: () => void; onCancel: (p: DbDealerPurchase) => void;
}) {
  const pending = purchases.filter((p) => p.status === "Pending");
  const spent = purchases.filter((p) => p.status === "Delivered").reduce((s, p) => s + p.amount, 0);
  return (
    <div style={{ paddingBottom: 12 }}>
      <PageHeader title="Dealer Shop" right={verified ? (
        <button onClick={onBuy} className="press" style={{ border: "none", borderRadius: 999, background: "var(--blue)", color: "white", fontSize: 13, fontWeight: 700, padding: "8px 14px", cursor: "pointer" }}>+ Buy</button>
      ) : undefined} />
      <div style={{ padding: "0 16px" }}>
        <div style={{ ...card, padding: "14px 16px", display: "flex" }}>
          {([["Orders", purchases.length], ["Coming", pending.length], ["Bought", inr(spent)]] as const).map(([l, v], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{v}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: "10px 4px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          {verified ? "Buy spare parts, purifiers and POP material (banners, standees, stickers) from Zavtoo at partner prices. Spares you buy appear in Listings once delivered." : "The Dealer Shop opens once Zavtoo verifies your shop."}
        </p>

        <h3 style={sectionH}>Your orders to Zavtoo</h3>
        {purchases.length === 0 ? (
          <Empty title="No orders yet" body="Spares, products and POP material you order from Zavtoo show here with their status."
            action={verified ? <PrimaryButton onClick={onBuy} style={{ maxWidth: 220, margin: "0 auto" }}>Browse the shop</PrimaryButton> : undefined} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {purchases.map((p) => (
              <div key={p.id} style={{ ...card, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, flex: 1, fontSize: 13.5, fontWeight: 700 }}>#{p.ref} · {inr(p.amount)}</p>
                  <Badge tone={TONE[p.status]}>{LABEL[p.status]}</Badge>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{p.items.map((it) => `${it.name} × ${it.qty}`).join(", ")}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-mute)" }}>{fmtStamp(p.created_at)}{p.note ? ` · ${p.note}` : ""}</p>
                {p.status === "Pending" && (
                  <button onClick={() => onCancel(p)} style={{ marginTop: 8, background: "none", border: "none", padding: 0, color: "var(--red)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Cancel order</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
