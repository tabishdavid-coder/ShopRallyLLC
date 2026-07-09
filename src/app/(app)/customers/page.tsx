import { getCustomers } from "@/server/customers";
import { getShopId } from "@/lib/shop";
import { prisma } from "@/db/client";
import { getCustomerTagNames } from "@/server/actions/customer-settings";
import { getDefaultAppointmentDuration } from "@/server/actions/appointments";
import { getShopTechnicians } from "@/server/staff";
import { CustomersTable } from "@/components/customers/customers-table";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; perPage?: string; customer?: string; tab?: string; highlight?: string }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const q = sp.q ?? "";
  const page = Number(sp.page) || 1;
  const perPage = Number(sp.perPage) || 10;

  const [{ rows, total }, customerTags, shop, appointmentEmployees, defaultAppointmentDurationMins] =
    await Promise.all([
      getCustomers({ shopId, q, page, perPage }),
      getCustomerTagNames(),
      prisma.shop.findUnique({ where: { id: shopId }, select: { defaultMarketingOptIn: true } }),
      getShopTechnicians(shopId),
      getDefaultAppointmentDuration(),
    ]);

  return (
    <CustomersTable
      rows={rows}
      total={total}
      page={page}
      perPage={perPage}
      query={q}
      customerTags={customerTags}
      defaultMarketingOptIn={shop?.defaultMarketingOptIn ?? false}
      appointmentEmployees={appointmentEmployees}
      defaultAppointmentDurationMins={defaultAppointmentDurationMins}
    />
  );
}
