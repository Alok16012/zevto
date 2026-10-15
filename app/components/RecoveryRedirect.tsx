"use client";

import { useEffect } from "react";

/* Supabase sends a password-reset link to its "Site URL" (usually the home page) instead of
 * /reset-password when the redirect isn't on the project's allowed list. Wherever the link
 * lands, pass its tokens (or its error) on to the reset page so the reset still works. */

export default function RecoveryRedirect() {
  useEffect(() => {
    const { pathname, hash } = window.location;
    if (pathname === "/reset-password" || !hash) return;
    const h = new URLSearchParams(hash.slice(1));
    if (h.get("type") === "recovery" || h.get("error_code")) window.location.replace(`/reset-password${hash}`);
  }, []);
  return null;
}
