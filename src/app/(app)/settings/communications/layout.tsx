import { CommunicationsTabs } from "@/components/settings/communications-tabs";

export default function CommunicationsSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <CommunicationsTabs />
      {children}
    </div>
  );
}
