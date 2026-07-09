import { MessagesInbox } from "@/components/messages/messages-inbox";
import {
  getInboxConversationsForCustomer,
  getMessagingSettings,
} from "@/server/actions/messaging-settings";

export const metadata = { title: "Messages — ShopRally" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const [conversations, settings] = await Promise.all([
    getInboxConversationsForCustomer(customerId),
    getMessagingSettings(),
  ]);

  const mockMode = !settings.platformTwilioConfigured;

  return (
    <div className="-mx-4 -mb-4 flex min-h-0 flex-1 flex-col overflow-hidden md:-mx-6 md:-mb-6">
      <MessagesInbox
        conversations={conversations}
        initialCustomerId={customerId}
        mockMode={mockMode}
      />
    </div>
  );
}
