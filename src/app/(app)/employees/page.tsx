import { getShopId } from "@/lib/shop";
import { getEmployees, getEmployeeCounts } from "@/server/employees";
import { EmployeesView } from "@/components/employees/employees-view";

export const metadata = { title: "Employees — ShopRally" };

export default async function EmployeesPage() {
  const shopId = await getShopId();
  const [rows, counts] = await Promise.all([
    getEmployees(shopId, { active: true }),
    getEmployeeCounts(shopId),
  ]);
  return <EmployeesView initialRows={rows} counts={counts} />;
}
