"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Tag, Pencil, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customerDisplayName } from "@/lib/format";
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog";
import {
  CustomerBulkEditDialog,
  CustomerTagDialog,
} from "@/components/customers/customer-bulk-dialogs";
import {
  CustomerContextDrawer,
  type ContextDrawerTab,
} from "@/components/customers/customer-context-drawer";
import type { EditableCustomerRecord } from "@/components/customers/customer-form-shared";
import type { CustomerRow } from "@/server/customers";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const DRAWER_TABS = new Set<ContextDrawerTab>([
  "profile",
  "vehicles",
  "carePlan",
  "deferred",
  "orders",
  "payment",
  "finances",
]);

function seedCustomer(row: CustomerRow): EditableCustomerRecord {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    company: row.company,
    phone: row.phone,
    email: row.email,
    address: null,
    city: null,
    state: null,
    zip: null,
    marketingOptIn: false,
    notes: null,
    tags: row.tags,
  };
}

export function CustomersTable({
  rows,
  total,
  page,
  perPage,
  query,
  customerTags = [],
  defaultMarketingOptIn = false,
  appointmentEmployees,
  defaultAppointmentDurationMins,
}: {
  rows: CustomerRow[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  customerTags?: string[];
  defaultMarketingOptIn?: boolean;
  appointmentEmployees: { id: string; name: string }[];
  defaultAppointmentDurationMins: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagOpen, setTagOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const drawerCustomerId =
    params.get("customer") ?? params.get("highlight") ?? null;
  const drawerTabParam = params.get("tab");
  const mappedTab =
    drawerTabParam === "maintenance" ? "carePlan" : drawerTabParam;
  const drawerTab: ContextDrawerTab =
    mappedTab && DRAWER_TABS.has(mappedTab as ContextDrawerTab)
      ? (mappedTab as ContextDrawerTab)
      : "profile";

  const drawerRow = useMemo(
    () => rows.find((r) => r.id === drawerCustomerId) ?? null,
    [rows, drawerCustomerId],
  );

  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const sp = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, String(v));
      }
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  const openCustomerDrawer = useCallback(
    (customerId: string, tab: ContextDrawerTab = "profile") => {
      setParams({ customer: customerId, highlight: null, tab: tab === "profile" ? null : tab });
    },
    [setParams],
  );

  const closeCustomerDrawer = useCallback(
    (open: boolean) => {
      if (!open) setParams({ customer: null, highlight: null, tab: null });
    },
    [setParams],
  );

  const setDrawerTab = useCallback(
    (tab: ContextDrawerTab) => {
      setParams({ tab: tab === "profile" ? null : tab });
    },
    [setParams],
  );

  // Debounce the search box → ?q= (and reset to page 1).
  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => setParams({ q: search || null, page: null }), 350);
    return () => clearTimeout(t);
  }, [search, query, setParams]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const drawerSeedCustomer = drawerRow
    ? seedCustomer(drawerRow)
    : drawerCustomerId
      ? {
          id: drawerCustomerId,
          firstName: "",
          lastName: "",
          company: null,
          phone: null,
          email: null,
          address: null,
          city: null,
          state: null,
          zip: null,
          marketingOptIn: false,
          notes: null,
          tags: [],
        }
      : null;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-0 flex-1 basis-56 sm:max-w-xl">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          {isPending ? (
            <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
          ) : null}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, email, plate, or VIN"
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={selected.size === 0}
          onClick={() => setTagOpen(true)}
        >
          <Tag className="size-4" />
          Tag
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={selected.size === 0}
          onClick={() => setBulkOpen(true)}
        >
          <Pencil className="size-4" />
          Bulk Edit{selected.size ? ` (${selected.size})` : ""}
        </Button>
        <AddCustomerDialog availableTags={customerTags} defaultMarketingOptIn={defaultMarketingOptIn} />
      </div>

      <CustomerTagDialog
        open={tagOpen}
        onOpenChange={setTagOpen}
        customerIds={[...selected]}
        availableTags={customerTags}
        onSuccess={() => setSelected(new Set())}
      />
      <CustomerBulkEditDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        customerIds={[...selected]}
        onSuccess={() => setSelected(new Set())}
      />

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allOnPageSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all on page"
              />
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Primary Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No customers found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <TableRow
                key={c.id}
                data-state={selected.has(c.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => openCustomerDrawer(c.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label="Select row"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    className="text-left text-brand-navy hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCustomerDrawer(c.id);
                    }}
                  >
                    {customerDisplayName(c)}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{c.email ?? ""}</TableCell>
                <TableCell>
                  {c.tags.length ? (
                    <Badge variant="secondary" className="font-normal">
                      {c.tags[0]}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.company ? "Business" : "Person"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-end gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => setParams({ perPage: v, page: null })}
          >
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="tabular-nums">
          {from}–{to} of {total}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            onClick={() => setParams({ page: page - 1 })}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={page >= lastPage}
            onClick={() => setParams({ page: page + 1 })}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {drawerSeedCustomer && drawerCustomerId ? (
        <CustomerContextDrawer
          open={Boolean(drawerCustomerId)}
          onOpenChange={closeCustomerDrawer}
          tab={drawerTab}
          onTabChange={setDrawerTab}
          customer={drawerSeedCustomer}
          customerId={drawerCustomerId}
          canEdit
          initialData={null}
          appointmentEmployees={appointmentEmployees}
          defaultAppointmentDurationMins={defaultAppointmentDurationMins}
          source="customers"
        />
      ) : null}
    </div>
  );
}
