"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchShop } from "@/server/actions/platform";
import type { PlatformCustomerRow } from "@/server/platform/customers";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PlatformCustomersTable({
  rows,
  total,
  shops,
  initialSearch = "",
  initialShopId = "",
}: {
  rows: PlatformCustomerRow[];
  total: number;
  shops: { id: string; name: string; code: string }[];
  initialSearch?: string;
  initialShopId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [shopFilter, setShopFilter] = useState(initialShopId || "all");
  const [pending, start] = useTransition();

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");
    if (shopFilter && shopFilter !== "all") params.set("shop", shopFilter);
    else params.delete("shop");
    router.push(`/platform/customers?${params.toString()}`);
  }

  const shopOptions = useMemo(
    () => [{ id: "all", name: "All shops", code: "" }, ...shops.map((s) => ({ ...s, name: s.name }))],
    [shops],
  );

  function openInShop(shopId: string, customerId: string) {
    start(async () => {
      const res = await switchShop(shopId);
      if (res.ok) {
        router.push(`/customers?customer=${customerId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search name, email, phone, or shop…"
            className="pl-8"
          />
        </div>
        <Select value={shopFilter} onValueChange={setShopFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Shop" />
          </SelectTrigger>
          <SelectContent>
            {shopOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.id === "all" ? "All shops" : s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={applyFilters} className="bg-brand-navy">
          Search
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {total.toLocaleString()} customers across all shops
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">ROs</th>
              <th className="px-4 py-3">Lead source</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-brand-navy">
                  {row.firstName} {row.lastName}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/platform/shops/${row.shopId}`} className="hover:underline">
                    {row.shopName}
                  </Link>
                  <span className="ml-1 text-xs text-muted-foreground">({row.shopCode})</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.email ?? "—"}
                  {row.phone ? <span className="block">{row.phone}</span> : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.repairOrderCount}</td>
                <td className="px-4 py-3 text-xs">{row.leadSource ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => openInShop(row.shopId, row.id)}
                  >
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Open in shop"}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No customers match your search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
