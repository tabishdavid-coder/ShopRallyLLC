import { MarkupsTabs } from "@/components/settings/markups-tabs";

export default function MarkupsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <MarkupsTabs />
      {children}
    </div>
  );
}
