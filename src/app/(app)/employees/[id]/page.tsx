import { notFound } from "next/navigation";

import { getShopId } from "@/lib/shop";
import { getEmployeeDetail, getLoginHistory } from "@/server/employees";
import { EmployeeDetailView } from "@/components/employees/employee-detail-view";

export const metadata = { title: "Employee — ShopRally" };

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shopId = await getShopId();
  const employee = await getEmployeeDetail(shopId, id);
  if (!employee) notFound();

  const loginHistory = await getLoginHistory(shopId, employee.userId);

  return <EmployeeDetailView employee={employee} loginHistory={loginHistory} />;
}
