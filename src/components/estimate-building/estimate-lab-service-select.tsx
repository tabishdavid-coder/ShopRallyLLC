"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ServiceJobSummary } from "@/lib/service-job-parts";
import { serviceJobOptionLabel } from "@/lib/service-job-parts";
import { cn } from "@/lib/utils";

export function EstimateLabServiceSelect({
  value,
  jobs,
  disabled,
  onValueChange,
  className,
  placeholder = "Select service",
}: {
  value: string;
  jobs: ServiceJobSummary[];
  disabled?: boolean;
  onValueChange: (jobId: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const needsParts = jobs.filter((j) => j.needsParts);
  const hasParts = jobs.filter((j) => !j.needsParts);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("h-8 w-full max-w-[13rem] text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {needsParts.length > 0 ? (
          <SelectGroup>
            <SelectLabel className="text-[10px] uppercase tracking-wide text-amber-800">
              Needs parts
            </SelectLabel>
            {needsParts.map((j) => (
              <SelectItem key={j.id} value={j.id} className="text-xs">
                {serviceJobOptionLabel(j)}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {hasParts.length > 0 ? (
          <SelectGroup>
            {needsParts.length > 0 ? (
              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Other services
              </SelectLabel>
            ) : (
              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Services on estimate
              </SelectLabel>
            )}
            {hasParts.map((j) => (
              <SelectItem key={j.id} value={j.id} className="text-xs">
                {serviceJobOptionLabel(j)}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {jobs.length === 0 ? (
          <SelectItem value="__none" disabled>
            Add a service on the Services tab first
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  );
}
