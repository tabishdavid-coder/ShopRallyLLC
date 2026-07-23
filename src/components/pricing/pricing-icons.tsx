import type { ChecklistIcon } from "@/components/pricing/pricing-data";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.1,
};

export function ChecklistIconSvg({ name }: { name: ChecklistIcon }) {
  switch (name) {
    case "team":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "crm":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
      );
    case "est":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M9 13h6M9 17h4" />
        </svg>
      );
    case "dvi":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "sched":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18" />
        </svg>
      );
    case "pay":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
      );
    case "ops":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-5 3 3 5-7" />
        </svg>
      );
    case "cat":
    case "onb":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z" />
          {name === "onb" ? <path d="m9 11 2 2 4-4" /> : null}
        </svg>
      );
    case "comms":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9.4 8.3 8.6 8.6 0 0 1-3.1-.8L3 21l2-5.5a8.4 8.4 0 1 1 16-4Z" />
        </svg>
      );
    case "ai":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
        </svg>
      );
    default:
      return null;
  }
}

export function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z" />
    </svg>
  );
}
