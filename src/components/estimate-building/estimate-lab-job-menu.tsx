"use client";

import {
  BookOpen,
  Calculator,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type EstimateLabJobMenuHandlers = {
  onAddLabor: () => void;
  onAddPart: () => void;
  onPartLookup?: () => void;
  onAddFee: () => void;
  onAddDiscount: () => void;
  onAdvancedEdit?: () => void;
  onSaveAsCanned?: () => void;
  onDelete: () => void;
};

/** Per-job actions menu — replaces edit-then-change with direct line actions (AutoLeap-style). */
export function EstimateLabJobMenu({
  disabled,
  handlers,
}: {
  disabled?: boolean;
  handlers: EstimateLabJobMenuHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          aria-label="Job actions"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Add to job</DropdownMenuLabel>
        <DropdownMenuItem onClick={handlers.onAddLabor}>
          <Plus className="size-3.5" />
          Add labor line
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlers.onAddPart}>
          <Wrench className="size-3.5" />
          Manual ordering
        </DropdownMenuItem>
        {handlers.onPartLookup ? (
          <DropdownMenuItem onClick={handlers.onPartLookup}>
            <Search className="size-3.5" />
            Parts lookup
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={handlers.onAddFee}>
          <Calculator className="size-3.5" />
          Add fee
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlers.onAddDiscount}>
          <Calculator className="size-3.5" />
          Add discount
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {handlers.onAdvancedEdit ? (
          <DropdownMenuItem onClick={handlers.onAdvancedEdit}>
            <Pencil className="size-3.5" />
            Matrix & bulk edit
          </DropdownMenuItem>
        ) : null}
        {handlers.onSaveAsCanned ? (
          <DropdownMenuItem onClick={handlers.onSaveAsCanned}>
            <BookOpen className="size-3.5" />
            Save as job template
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handlers.onDelete}>
          <Trash2 className="size-3.5" />
          Delete job
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
