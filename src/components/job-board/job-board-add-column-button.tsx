"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addJobBoardPipelineColumn } from "@/server/actions/job-board";
import { cn } from "@/lib/utils";

/** Quick-add a named pipeline section on the job board. */
export function JobBoardAddColumnButton({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await addJobBoardPipelineColumn(title);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-7 shrink-0 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
            className,
          )}
          title="Add pipeline section"
        >
          <Plus className="size-3.5" />
          <span className="hidden 2xl:inline">Add section</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add pipeline section</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          New sections appear to the right of your core columns. Drag repair orders into them for
          shop-specific workflow stages (e.g. Waiting on parts, Sublet, QC).
        </p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Section name"
          maxLength={80}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add section
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
