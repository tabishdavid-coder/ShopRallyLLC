// Client-safe permission definitions for the Employees module.

export type PermissionDef = {
  key: string;
  label: string;
  children?: PermissionDef[];
};

export type PermissionCategory = {
  id: string;
  label: string;
  permissions: PermissionDef[];
};

/** Granular permission categories shown in the Employees permissions editor. */
export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "customers",
    label: "Customers",
    permissions: [
      {
        key: "customers.view",
        label: "Can view customer contact information, vehicles, and repair order history",
      },
      { key: "customers.message", label: "Can message customers" },
      { key: "customers.export", label: "Can export customer list" },
      { key: "customers.unpost_ro", label: "Can unpost repair orders" },
      { key: "customers.change_tech", label: "Can change tech on posted repair orders" },
    ],
  },
  {
    id: "job_board",
    label: "Job Board and Tech Board",
    permissions: [
      {
        key: "job_board.view",
        label:
          "Can view the job board and tech board, repair orders they've created, and work assigned to them",
        children: [
          { key: "job_board.view_all", label: "Can view all active repair orders" },
          { key: "job_board.delete", label: "Can delete/restore repair orders" },
          { key: "job_board.save_later", label: "Can save repair orders for later" },
        ],
      },
    ],
  },
  {
    id: "estimate",
    label: "Estimate",
    permissions: [
      { key: "estimate.view", label: "Can view estimates on repair orders" },
      { key: "estimate.edit", label: "Can edit estimates (add/edit jobs, labor, and parts)" },
      { key: "estimate.approve", label: "Can approve estimates and start work" },
    ],
  },
  {
    id: "wip",
    label: "Work-In-Progress",
    permissions: [
      { key: "wip.view", label: "Can view work-in-progress tab and job hours" },
      { key: "wip.edit", label: "Can edit labor hours and job status" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    permissions: [
      { key: "payments.view", label: "Can view payments and invoices" },
      { key: "payments.collect", label: "Can collect payments and apply discounts" },
    ],
  },
  {
    id: "cash_drawer",
    label: "Cash Drawer",
    permissions: [{ key: "cash_drawer.manage", label: "Can open/close cash drawer and view drawer history" }],
  },
  {
    id: "finance",
    label: "Finance",
    permissions: [
      {
        key: "finance.payments_nav",
        label:
          "Enables Payments section to be visible in left navigation in order to view/interact with payments, payouts, disputes, financial accounts, etc.",
        children: [
          { key: "finance.capital", label: "Can view and interact with Capital financing in the payments navigation" },
          { key: "finance.account", label: "Can view and edit payment account details" },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    permissions: [{ key: "reports.view", label: "Can view shop reports and analytics" }],
  },
  {
    id: "inventory",
    label: "Parts",
    permissions: [
      {
        key: "inventory.view",
        label: "Can view parts, order history and activity",
        children: [
          {
            key: "inventory.edit",
            label: "Can create new parts; can edit part details and quantities",
          },
          { key: "inventory.bulk", label: "Bulk parts changes" },
          { key: "inventory.delete", label: "Can delete parts" },
        ],
      },
    ],
  },
  {
    id: "orders",
    label: "Orders",
    permissions: [{ key: "orders.manage", label: "Can view and manage parts orders" }],
  },
  {
    id: "vendors",
    label: "Vendors",
    permissions: [{ key: "vendors.manage", label: "Can view the vendor list; can create/edit/delete vendors" }],
  },
  {
    id: "canned_jobs",
    label: "Canned Jobs",
    permissions: [{ key: "canned_jobs.manage", label: "Can view, create, edit, and delete canned jobs" }],
  },
  {
    id: "inspections",
    label: "Inspections",
    permissions: [{ key: "inspections.manage", label: "Can view and edit vehicle inspections" }],
  },
  {
    id: "employees",
    label: "Employees",
    permissions: [
      {
        key: "employees.manage",
        label: "Can create/edit/deactivate/activate employees; can view employee login history",
        children: [
          { key: "employees.permissions", label: "Can edit employee permissions" },
          { key: "employees.groups", label: "Can create/edit/delete permission groups" },
        ],
      },
    ],
  },
];

/** Flatten all permission keys (including nested children). */
export function allPermissionKeys(): string[] {
  const keys: string[] = [];
  function walk(defs: PermissionDef[]) {
    for (const d of defs) {
      keys.push(d.key);
      if (d.children) walk(d.children);
    }
  }
  for (const cat of PERMISSION_CATEGORIES) walk(cat.permissions);
  return keys;
}

/** Keys granted by each default permission group. */
export const GROUP_PERMISSIONS: Record<string, string[]> = {
  "Shop Admin": allPermissionKeys(),
  "Service Advisor": [
    "customers.view",
    "customers.message",
    "job_board.view",
    "job_board.view_all",
    "job_board.save_later",
    "estimate.view",
    "estimate.edit",
    "estimate.approve",
    "wip.view",
    "payments.view",
    "payments.collect",
    "canned_jobs.manage",
    "inspections.manage",
  ],
  Technician: [
    "job_board.view",
    "estimate.view",
    "wip.view",
    "wip.edit",
    "inspections.manage",
  ],
  Manager: allPermissionKeys().filter((k) => k !== "employees.groups"),
  "Front Desk": [
    "customers.view",
    "customers.message",
    "job_board.view",
    "estimate.view",
    "payments.view",
    "payments.collect",
  ],
};

/** Resolve effective permission keys for a membership. */
export function resolvePermissions(
  permissionMode: string,
  permissionGroup: string | null,
  permissions: string[],
): string[] {
  if (permissionMode === "INDIVIDUAL") return permissions;
  if (permissionGroup && GROUP_PERMISSIONS[permissionGroup]) return GROUP_PERMISSIONS[permissionGroup];
  return [];
}

/** All keys in a category (including nested). */
export function categoryKeys(categoryId: string): string[] {
  const cat = PERMISSION_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  const keys: string[] = [];
  function walk(defs: PermissionDef[]) {
    for (const d of defs) {
      keys.push(d.key);
      if (d.children) walk(d.children);
    }
  }
  walk(cat.permissions);
  return keys;
}
