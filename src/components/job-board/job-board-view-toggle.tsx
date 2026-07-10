"use client";



import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useCallback, useTransition } from "react";

import { ArrowDownWideNarrow, Columns3, List } from "lucide-react";



import { Button } from "@/components/ui/button";

import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import {

  JOB_BOARD_SORT,

  JOB_BOARD_SORT_LABELS,

  type JobBoardSort,

  type JobBoardView,

} from "@/lib/job-board-filters";

import { cn } from "@/lib/utils";



const COMPACT_BTN =

  "h-7 shrink-0 gap-1 rounded-none px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5";



export function JobBoardViewToggle({

  view,

  sort,

}: {

  view: JobBoardView;

  sort: JobBoardSort;

}) {

  const router = useRouter();

  const pathname = usePathname();

  const params = useSearchParams();

  const [isPending, startTransition] = useTransition();



  const setParam = useCallback(

    (key: string, value: string | null) => {

      const sp = new URLSearchParams(params.toString());

      if (value) sp.set(key, value);

      else sp.delete(key);

      startTransition(() => router.push(`${pathname}?${sp.toString()}`));

    },

    [params, pathname, router],

  );



  const setView = (next: JobBoardView) => {

    setParam("view", next === "board" ? null : next);

  };



  return (

    <div className="inline-flex shrink-0 items-center gap-1">

      <div

        className={cn(

          "inline-flex shrink-0 rounded-none border bg-card p-0.5",

          isPending && "opacity-70",

        )}

      >

        <Button

          type="button"

          variant={view === "board" ? "default" : "ghost"}

          size="sm"

          className={cn(

            COMPACT_BTN,

            view === "board" && "bg-brand-navy text-white hover:bg-brand-navy/90",

          )}

          onClick={() => setView("board")}

          title="Board view"

        >

          <Columns3 className="size-3.5" />

        </Button>

        <Button

          type="button"

          variant={view === "list" ? "default" : "ghost"}

          size="sm"

          className={cn(

            COMPACT_BTN,

            view === "list" && "bg-brand-navy text-white hover:bg-brand-navy/90",

          )}

          onClick={() => setView("list")}

          title="List view"

        >

          <List className="size-3.5" />

        </Button>

      </div>



      {view === "list" ? (

        <DropdownMenu>

          <DropdownMenuTrigger asChild>

            <Button

              variant="outline"

              size="sm"

              className={COMPACT_BTN}

              title={`Sort: ${JOB_BOARD_SORT_LABELS[sort]}`}

            >

              <ArrowDownWideNarrow className="size-3.5" />

              <span className="hidden xl:inline">{JOB_BOARD_SORT_LABELS[sort]}</span>

            </Button>

          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-40">

            {JOB_BOARD_SORT.map((key) => (

              <DropdownMenuItem

                key={key}

                onSelect={() => setParam("sort", key === "number" ? null : key)}

              >

                {JOB_BOARD_SORT_LABELS[key]}

              </DropdownMenuItem>

            ))}

          </DropdownMenuContent>

        </DropdownMenu>

      ) : null}

    </div>

  );

}


