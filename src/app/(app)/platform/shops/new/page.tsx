import { PlatformAddShopPage } from "@/components/platform/platform-add-shop-page";

export const metadata = { title: "Add shop — ShopRally Platform" };

type SearchParams = Promise<{ name?: string; email?: string; phone?: string }>;

export default async function PlatformNewShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const prefill =
    params.name || params.email || params.phone
      ? {
          name: params.name?.trim(),
          email: params.email?.trim(),
          phone: params.phone?.trim(),
        }
      : undefined;

  return <PlatformAddShopPage prefill={prefill} />;
}
