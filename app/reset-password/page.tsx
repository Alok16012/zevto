import type { Metadata } from "next";
import ResetPassword from "./ResetPassword";

export const metadata: Metadata = {
  title: "Reset password · Zavtoo",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPassword />;
}
