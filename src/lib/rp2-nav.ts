import {
  LayoutDashboard,
  MessageSquare,
  Columns3,
  ClipboardList,
  Users,
  Car,
  FileSpreadsheet,
  CalendarDays,
  Calendar,
  Package,
  IdCard,
  Clock,
  ClipboardCheck,
  BarChart3,
  Megaphone,
  Bell,
  Settings,
  LifeBuoy,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";

import type { NavGroup, NavItem } from "@/lib/nav";

/** Option 23 CRM sidebar — flat menu matching the approved mockup. */
export const RP2_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Job Board", href: "/job-board", icon: Columns3 },
      { title: "Jobs / RO", href: "/job-board", icon: ClipboardList },
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Vehicles", href: "/vehicles", icon: Car, stub: true },
      { title: "Estimates", href: "/job-board", icon: FileSpreadsheet },
      { title: "Appointments", href: "/appointments", icon: CalendarDays },
      { title: "Calendar", href: "/calendar", icon: Calendar, stub: true },
      { title: "Parts", href: "/inventory", icon: Package },
      { title: "Technicians", href: "/employees", icon: IdCard },
      { title: "Time Clock", href: "/time-clock", icon: Clock, stub: true },
      { title: "Digital Inspections", href: "/inspections", icon: ClipboardCheck },
      { title: "Reports", href: "/reports", icon: BarChart3 },
      { title: "Marketing", href: "/marketing", icon: Megaphone },
      { title: "Messages", href: "/messages", icon: MessageSquare },
      { title: "Notifications", href: "/notifications", icon: Bell, stub: true },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const RP2_NAV_ITEMS: NavItem[] = RP2_NAV_GROUPS.flatMap((g) => g.items);

export const RP2_FOOTER_NAV: NavItem[] = [
  { title: "Support Center", href: "/support", icon: LifeBuoy },
];

export function rp2NavTitle(pathname: string): string | undefined {
  if (pathname.startsWith("/repair-orders/")) return "Repair Order";
  const match = RP2_NAV_ITEMS.find((item) =>
    pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.title;
}
