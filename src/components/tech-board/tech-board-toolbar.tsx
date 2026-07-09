"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, User, Settings2, Loader2, ChevronDown, Columns3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TechBoardToolbar({
  query,
  technicianId,
  technicians,
}: {
  query: string;
  technicianId: string;
  technicians: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query);

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(key, value);
      else sp.delete(key);
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    },
    [params, pathname, router],
  );

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(params.toString());
      if (search) sp.set("q", search);
      else sp.delete("q");
      startTransition(() => router.push(`${pathname}?${sp.toString()}`));
    }, 350);
    return () => clearTimeout(t);
  }, [search, query, params, pathname, router]);

  const techLabel = technicians.find((t) => t.id === technicianId)?.name ?? "Technician";

  return (
    <div className="job-board-toolbar flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-56 sm:max-w-md">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        {isPending ? (
          <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />
        ) : null}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, RO#, vehicle…"
          className="border-brand-navy/20 bg-card pl-8 focus-visible:ring-brand-navy"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <User className="size-4" />
            {technicianId ? techLabel : "Technician"}
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto">
          <DropdownMenuItem onSelect={() => setFilter("tech", null)}>All technicians</DropdownMenuItem>
          {technicians.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => setFilter("tech", t.id)}>
              {t.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled
        title="Column visibility & order — configure in Employees (coming soon)"
      >
        <Settings2 className="size-4" />
        Board setup
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/employees">
            <User className="size-4" />
            Employees
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href="/job-board">
            <Columns3 className="size-4" />
            Job Board
          </Link>
        </Button>
      </div>
    </div>
  );
}
