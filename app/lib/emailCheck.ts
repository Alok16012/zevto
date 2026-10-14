/* Email checks that need no network — safe to use in the browser and on the server. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Real providers people commonly mistype. Also the "no suggestion" list: a domain here is never "corrected".
const COMMON = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "ymail.com", "rediffmail.com",
  "hotmail.com", "outlook.com", "outlook.in", "live.com", "msn.com", "icloud.com", "me.com", "mail.com", "aol.com",
  "protonmail.com", "proton.me", "zoho.com", "zohomail.in",
];

// Throwaway inboxes — accounts made with these can't be reached later.
const DISPOSABLE = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com",
  "tempmail.com", "temp-mail.org", "tempmail.net", "tempmailo.com", "trashmail.com", "getnada.com", "dispostable.com",
  "throwawaymail.com", "maildrop.cc", "fakeinbox.com", "mailnesia.com", "emailondeck.com", "mohmal.com",
  "mintemail.com", "discard.email", "spamgourmet.com", "mailcatch.com", "tempinbox.com", "burnermail.io",
]);

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]++;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return row[b.length];
}

/** "rahul@gmial.com" → "rahul@gmail.com"; null when nothing looks mistyped. */
export function emailTypo(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || COMMON.includes(domain)) return null;
  let best: string | null = null, bestD = 3;
  for (const c of COMMON) {
    const d = distance(domain, c);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best ? `${email.slice(0, at)}@${best}` : null;
}

/** Format and throwaway-inbox check; returns the problem, or null. */
export function emailFormatProblem(email: string): string | null {
  if (!EMAIL_RE.test(email) || email.length > 254 || /\.\.|@\.|\.@/.test(email)) return "Enter a valid email";
  if (DISPOSABLE.has(email.slice(email.lastIndexOf("@") + 1).toLowerCase())) return "Temporary email addresses aren't allowed. Use your regular email.";
  return null;
}
