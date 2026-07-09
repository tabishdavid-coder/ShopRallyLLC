"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Users, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PERMISSION_CATEGORIES, GROUP_PERMISSIONS, type PermissionDef } from "@/lib/permissions";
import { PERMISSION_GROUPS } from "@/lib/employees";

export type PermissionMode = "GROUP" | "INDIVIDUAL";

type Props = {
  mode: PermissionMode;
  onModeChange: (mode: PermissionMode) => void;
  permissionGroup: string;
  onPermissionGroupChange: (group: string) => void;
  permissions: string[];
  onPermissionsChange: (keys: string[]) => void;
  disabled?: boolean;
  showModeToggle?: boolean;
};

export function PermissionsEditor({
  mode,
  onModeChange,
  permissionGroup,
  onPermissionGroupChange,
  permissions,
  onPermissionsChange,
  disabled,
  showModeToggle = true,
}: Props) {
  const [categoryId, setCategoryId] = useState(PERMISSION_CATEGORIES[0]?.id ?? "customers");
  const [groupSearch, setGroupSearch] = useState("");

  const category = PERMISSION_CATEGORIES.find((c) => c.id === categoryId) ?? PERMISSION_CATEGORIES[0];
  const categoryKeys = useMemo(() => {
    const keys: string[] = [];
    function walk(defs: PermissionDef[]) {
      for (const d of defs) {
        keys.push(d.key);
        if (d.children) walk(d.children);
      }
    }
    if (category) walk(category.permissions);
    return keys;
  }, [category]);

  const filteredGroups = useMemo(() => {
    const needle = groupSearch.trim().toLowerCase();
    return PERMISSION_GROUPS.filter((g) => !needle || g.toLowerCase().includes(needle));
  }, [groupSearch]);

  const groupPreview = permissionGroup ? GROUP_PERMISSIONS[permissionGroup] ?? [] : [];

  function toggleKey(key: string, checked: boolean) {
    onPermissionsChange(checked ? [...new Set([...permissions, key])] : permissions.filter((k) => k !== key));
  }

  function toggleCategoryAll(checked: boolean) {
    if (checked) onPermissionsChange([...new Set([...permissions, ...categoryKeys])]);
    else onPermissionsChange(permissions.filter((k) => !categoryKeys.includes(k)));
  }

  const categoryAllChecked = categoryKeys.length > 0 && categoryKeys.every((k) => permissions.includes(k));
  const categorySomeChecked = categoryKeys.some((k) => permissions.includes(k));

  return (
    <div className="space-y-4">
      {showModeToggle ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "GROUP"}
            onClick={() => !disabled && onModeChange("GROUP")}
            icon={<Users className="size-4" />}
            title="Permission Group"
            description="Assign an existing permission group shared amongst other employees."
          />
          <ModeCard
            active={mode === "INDIVIDUAL"}
            onClick={() => !disabled && onModeChange("INDIVIDUAL")}
            icon={<User className="size-4" />}
            title="Individual Permission"
            description="Assign permissions that are customized to this employee."
          />
        </div>
      ) : null}

      {mode === "GROUP" ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Select one</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search permission groups"
                className="pl-8"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md border">
            {filteredGroups.map((g) => (
              <button
                key={g}
                type="button"
                disabled={disabled}
                onClick={() => onPermissionGroupChange(g)}
                className={cn(
                  "flex w-full items-center justify-between border-b px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent",
                  permissionGroup === g && "bg-primary/10 text-primary",
                )}
              >
                <span>{g}</span>
                {permissionGroup === g ? <span className="text-xs">Selected</span> : null}
              </button>
            ))}
          </div>
          <div className="rounded-lg border bg-muted/20 p-6 text-center">
            <SlidersHorizontal className="mx-auto mb-2 size-8 text-primary/60" />
            <p className="text-sm font-medium">Permission Group View</p>
            {permissionGroup ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {groupPreview.length} permission{groupPreview.length === 1 ? "" : "s"} in <b>{permissionGroup}</b>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Select a group to preview its permissions.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] overflow-hidden rounded-lg border">
          <nav className="w-52 shrink-0 overflow-y-auto border-r bg-muted/20">
            {PERMISSION_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={disabled}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "block w-full border-b px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent",
                  categoryId === c.id && "bg-primary/10 font-medium text-primary",
                )}
              >
                {c.label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            <h4 className="mb-3 font-semibold">{category?.label}</h4>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <Checkbox
                checked={categoryAllChecked ? true : categorySomeChecked ? "indeterminate" : false}
                disabled={disabled}
                onCheckedChange={(v) => toggleCategoryAll(v === true)}
              />
              Select all
            </label>
            <div className="space-y-3">
              {category?.permissions.map((p) => (
                <PermissionRow
                  key={p.key}
                  def={p}
                  permissions={permissions}
                  disabled={disabled}
                  onToggle={toggleKey}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
        active && "border-primary bg-primary/5 ring-1 ring-primary/30",
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-medium">
        <span className={cn("rounded-md p-1", active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          {icon}
        </span>
        {title}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function PermissionRow({
  def,
  permissions,
  disabled,
  onToggle,
  depth = 0,
}: {
  def: PermissionDef;
  permissions: string[];
  disabled?: boolean;
  onToggle: (key: string, checked: boolean) => void;
  depth?: number;
}) {
  const checked = permissions.includes(def.key);
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={(v) => onToggle(def.key, v === true)}
          className="mt-0.5"
        />
        <span>{def.label}</span>
      </label>
      {def.children?.map((c) => (
        <div key={c.key} className="mt-2">
          <PermissionRow def={c} permissions={permissions} disabled={disabled} onToggle={onToggle} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
