import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Same typeface as the CLATians student app — self-hosted via next/font.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
    <html lang="en" className={poppins.variable}>
      <body style={{ margin: 0, padding: 0, minHeight: "100vh", fontFamily: "var(--font-poppins)" }}>
        {children}
      </body>
    </html>
  );
}
