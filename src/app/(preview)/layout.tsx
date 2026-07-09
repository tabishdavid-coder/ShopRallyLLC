import { PreviewAppShell } from "@/components/ui-preview/preview-app-shell";
import { getShopId, listShops } from "@/lib/shop";
import { getNotifications } from "@/server/notifications";
import { countUnreadMessages } from "@/server/messages-inbox";

export default async function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shops, activeShopId] = await Promise.all([listShops(), getShopId()]);
  const dbSeeded = shops.length > 0;

  const [notificationData, unreadSmsCount] = dbSeeded
    ? await Promise.all([
        getNotifications(activeShopId),
        countUnreadMessages(activeShopId),
      ])
    : [{ notifications: [], unreadCount: 0 }, 0];

  return (
    <PreviewAppShell
      shops={shops}
      activeShopId={activeShopId}
      notifications={notificationData.notifications}
      unreadCount={notificationData.unreadCount}
      unreadSmsCount={unreadSmsCount}
    >
      {children}
    </PreviewAppShell>
  );
}
