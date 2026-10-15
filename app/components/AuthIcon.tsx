export default function AuthIcon({ kind }: { kind: "home" | "email" | "lock" | "eye" | "eyeOff" | "arrow" | "technician" | "dealer" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "home" ? <path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9" />
      : kind === "technician" ? <path d="M14.5 6.5 18 3a7 7 0 0 0-9 8.8l-7 7a2.8 2.8 0 0 0 4 4l7-7A7 7 0 0 0 21.8 7l-3.5 3.5-3.8-4Z" />
      : kind === "dealer" ? <><path d="M4 10v11h16V10M3 6l2-3h14l2 3v4a3 3 0 0 1-4 0 3 3 0 0 1-5 0 3 3 0 0 1-5 0 3 3 0 0 1-4 0ZM3 6h18M9 21v-7h6v7" /></>
      : kind === "email" ? <><rect x="2" y="3" width="20" height="18" rx="2" /><path d="m3 5 9 8 9-8" /></>
      : kind === "lock" ? <><rect x="4" y="10" width="16" height="12" rx="3" /><path d="M7 10V6a5 5 0 0 1 10 0v4M12 15v3" /></>
      : kind === "arrow" ? <path d="M3 12h18m-7-7 7 7-7 7" />
      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />{kind === "eyeOff" && <path d="m3 3 18 18" />}</>}
  </svg>;
}
