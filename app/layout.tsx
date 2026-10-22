import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import "./mobile-theme.css";
import RecoveryRedirect from "./components/RecoveryRedirect";

// Same typeface as the CLATians student app — self-hosted via next/font.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});
// Website (storefront) type: condensed display headings over a plain body face.
const display = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap", variable: "--font-display" });
const body = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://zavtoo.in"),
  title: "Zavtoo Paani Filter",
  description: "Zavtoo Paani Filter — RO water purifiers, 500+ genuine spare parts, repair, installation and AMC across India.",
  openGraph: { siteName: "Zavtoo Paani Filter", type: "website", locale: "en_IN", images: ["/hero-kitchen.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#eef1fb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${display.variable} ${body.variable}`}>
      <body style={{ margin: 0, padding: 0, minHeight: "100vh", fontFamily: "var(--font-poppins)" }}>
        <RecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
