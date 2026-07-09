export const metadata = { title: "About — ShopRally" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <h1 className="text-2xl font-bold">About ShopRally</h1>
      <p className="text-muted-foreground">
        ShopRally is cloud shop-management software for independent auto repair shops — estimates,
        job board, inspections, messaging, and payments in one place.
      </p>
    </div>
  );
}
