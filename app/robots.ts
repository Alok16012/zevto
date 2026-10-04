import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    // The customer, technician and admin apps sit behind logins; keep them out of search.
    rules: { userAgent: "*", allow: "/", disallow: ["/app", "/technician", "/admin", "/api/", "/cart", "/checkout", "/orders"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
