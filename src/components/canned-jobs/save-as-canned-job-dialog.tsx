"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANNED_JOB_CATEGORIES } from "@/lib/canned-job-schemas";
import { saveJobAsCannedJob } from "@/server/actions/canned-jobs";

type JobPreview = {
  id: string;
  name: string;
  note: string | null;
  laborLineCount: number;
  partLineCount: number;
  laborHours: number;
};

export function SaveAsCannedJobDialog({
  open,
  onOpenChange,
  job,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobPreview | null;
  categories: string[];
  onSaved?: (cannedJobId: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [openLibrary, setOpenLibrary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const categoryOptions = [
    ...new Set([...categories, ...CANNED_JOB_CATEGORIES, category].filter(Boolean)),
  ].sort();

  useEffect(() => {
    if (open && job) {
      setName(job.name);
      setCategory("");
      setOpenLibrary(false);
      setError(null);
    }
  }, [open, job]);

  function save() {
    if (!job) return;
    setError(null);
    start(async () => {
      const res = await saveJobAsCannedJob({
        jobId: job.id,
        name: name.trim() || job.name,
        category: category || null,
        description: job.note,
      });
      if (res.ok && res.id) {
        onSaved?.(res.id);
        if (openLibrary) {
          window.open("/canned-jobs", "_blank", "noopener,noreferrer");
        }
        onOpenChange(false);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-4 text-brand-navy" />
            Save as canned job
          </DialogTitle>
          <DialogDescription>
            Turn this estimate job into a reusable template for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{job.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {job.laborLineCount} labor line{job.laborLineCount === 1 ? "" : "s"} ·{" "}
                {job.laborHours.toFixed(1)}h · {job.partLineCount} part
                {job.partLineCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="save-cj-name">Template name</Label>
                <Input
                  id="save-cj-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Job name"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={category || "__none__"}
                  onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={openLibrary}
                  onChange={(e) => setOpenLibrary(e.target.checked)}
                  className="size-4 rounded border-input"
                />
                Open Canned Jobs library after saving
              </label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending || !name.trim()} className="gap-1.5">
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save template
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
