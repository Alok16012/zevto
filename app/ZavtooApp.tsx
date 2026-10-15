"use client";

import { useState } from "react";
import CustomerApp from "./CustomerApp";
import TechnicianApp from "./technician/TechnicianApp";
import DealerApp from "./dealer/DealerApp";
import { RoleBack, RoleChooser, type LoginRole } from "./components/RoleSwitch";
import { roleOf, useSession } from "./lib/supabase";

/* One app for customers, technicians and dealers. Logged out, it opens on a "Log in as" screen;
 * picking a role shows that role's login (with a link back), and once someone signs in their app takes over as before.
 * Each role keeps its own Supabase login, so whoever is signed in opens straight into their app. */

const ROLES: LoginRole[] = ["customer", "technician", "dealer"];

export default function ZavtooApp({ initialRole }: { initialRole?: LoginRole }) {
  const sessions = { customer: useSession("customer"), technician: useSession("technician"), dealer: useSession("dealer") };
  const [picked, setPicked] = useState<LoginRole | null>(initialRole ?? null);

  if (ROLES.some((r) => sessions[r] === undefined)) return <div style={{ position: "fixed", inset: 0, background: "var(--app-bg)" }} />;

  const signedIn = ROLES.filter((r) => roleOf(sessions[r] ?? null) === r);
  const role = picked ?? (initialRole && signedIn.includes(initialRole) ? initialRole : signedIn[0]);
  if (!role) return <RoleChooser onPick={setPicked} />;

  const roleSwitch = <RoleBack onBack={() => setPicked(null)} />;
  if (role === "technician") return <TechnicianApp roleSwitch={roleSwitch} />;
  if (role === "dealer") return <DealerApp roleSwitch={roleSwitch} />;
  // A signed-in customer still gets the splash; coming from the role screen goes straight to the login.
  return <CustomerApp roleSwitch={roleSwitch} skipIntro={!signedIn.includes("customer")} />;
}
