/* Server-only: checks an email's domain actually accepts mail (has MX records). */

import { resolveMx } from "node:dns/promises";
import { emailFormatProblem } from "./emailCheck";

const cache = new Map<string, boolean>();

async function domainAcceptsMail(domain: string): Promise<boolean> {
  const hit = cache.get(domain);
  if (hit !== undefined) return hit;
  try {
    const mx = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), 4000)),
    ]);
    // A "null MX" (RFC 7505) is a domain saying it never receives mail.
    const ok = mx.some((r) => r.exchange && r.exchange !== ".");
    cache.set(domain, ok);
    return ok;
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Domain doesn't exist or has no mail servers → definitely not reachable.
    if (code === "ENOTFOUND" || code === "ENODATA") { cache.set(domain, false); return false; }
    // DNS trouble on our side: don't block a real person's signup over it.
    return true;
  }
}

/** Format, throwaway-inbox and domain checks; returns the problem, or null. */
export async function emailProblem(email: string): Promise<string | null> {
  const format = emailFormatProblem(email);
  if (format) return format;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!(await domainAcceptsMail(domain))) return `${domain} can't receive email. Check the spelling of your email.`;
  return null;
}
