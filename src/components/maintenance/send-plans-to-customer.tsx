"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Send } from "lucide-react";

import { CustomerSearchResults } from "@/components/customers/customer-search-results";
import { SharePlansLinkDialog } from "@/components/maintenance/share-plans-link-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerPick } from "@/lib/picker-types";
import { searchCustomers } from "@/server/actions/pickers";

type Props = {
  plansUrl: string;
  shopName: string;
};

export function SendPlansToCustomer({ plansUrl, shopName }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerPick[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CustomerPick | null>(null);
  const [searching, startSearch] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchCustomers(query));
        } catch {
          setResults([]);
        }
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pickCustomer(c: CustomerPick) {
    setSelected(c);
    setQuery("");
    setResults([]);
    setOpen(true);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/20 p-3">
      <div className="relative min-w-[220px] flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Send link — search customer"
          className="pl-9 h-9"
        />
        {query.trim().length >= 2 && results.length > 0 ? (
          <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border bg-popover shadow-md">
            <CustomerSearchResults
              results={results}
              searching={searching}
              query={query}
              onSelect={pickCustomer}
              showEnterHint={false}
            />
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 h-9"
        disabled={!selected}
        onClick={() => setOpen(true)}
      >
        <Send className="size-3.5" />
        Send link
      </Button>

      <SharePlansLinkDialog
        open={open}
        onOpenChange={setOpen}
        plansUrl={plansUrl}
        shopName={shopName}
        customer={
          selected
            ? {
                id: selected.id,
                firstName: selected.firstName,
                lastName: selected.lastName,
                phone: selected.phone,
                email: selected.email,
              }
            : null
        }
      />
    </div>
  );
}
