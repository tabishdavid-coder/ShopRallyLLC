"use client";

import { useCallback, useRef, useState } from "react";
import { CloudUpload, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_FILES = 10;

export function ConcernMediaUpload({
  files,
  onFilesChange,
  disabled,
  compact = false,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = [...files];
      for (const file of Array.from(incoming)) {
        if (next.length >= MAX_FILES) break;
        if (!next.some((f) => f.name === file.name && f.size === file.size)) {
          next.push(file);
        }
      }
      onFilesChange(next);
    },
    [files, onFilesChange],
  );

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Media</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-md border border-dashed text-center transition-colors",
          compact ? "gap-1 px-3 py-3" : "gap-2 px-4 py-8",
          dragOver ? "border-brand-navy bg-brand-light/10" : "border-border bg-muted/20",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <CloudUpload className={cn("text-muted-foreground", compact ? "size-5" : "size-8")} />
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          Drag and drop files here, or{" "}
          <button
            type="button"
            disabled={disabled || files.length >= MAX_FILES}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brand-navy hover:underline disabled:opacity-50"
          >
            Choose files
          </button>
        </p>
        <p className="text-xs text-muted-foreground">Max {MAX_FILES} files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">{file.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeAt(i)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
