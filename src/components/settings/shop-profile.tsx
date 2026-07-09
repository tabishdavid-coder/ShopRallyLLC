"use client";

import { useRef, useState, useTransition } from "react";
import {
  MapPin,
  Phone,
  ImageIcon,
  Pencil,
  Check,
  X,
  UploadCloud,
  Loader2,
  Copy,
  KeyRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subnavVerticalClass } from "@/lib/subnav-styles";
import { shopTimezone } from "@/lib/shop-timezone";
import { updateShopProfile, type ShopProfilePatch } from "@/server/actions/shop";

export type ShopProfileData = {
  id: string;
  name: string;
  code: string;
  masterId: string;
  masterIdCreatedAt: Date;
  bookingSlug: string | null;
  shopIdLabel: string | null;
  licenseNo: string | null;
  taxId: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const inputCls =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring";

type Section = "address" | "contact" | "logo";

export function ShopProfile({ shop }: { shop: ShopProfileData }) {
  const [section, setSection] = useState<Section>("address");

  return (
    <div className="space-y-4">
      <ShopOverviewCard shop={shop} />

      <div>
        <h2 className="mb-2 text-base font-semibold">Shop Information</h2>
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {/* Sub-nav */}
          <nav className="flex flex-col gap-1">
            <SubNavItem icon={MapPin} label="Shop Address" active={section === "address"} onClick={() => setSection("address")} />
            <SubNavItem icon={Phone} label="Phone & Email" active={section === "contact"} onClick={() => setSection("contact")} />
            <SubNavItem icon={ImageIcon} label="Shop Logo" active={section === "logo"} onClick={() => setSection("logo")} />
          </nav>

          <div className="rounded-lg border bg-card">
            {section === "address" ? <AddressForm shop={shop} /> : null}
            {section === "contact" ? <ContactForm shop={shop} /> : null}
            {section === "logo" ? <LogoForm shop={shop} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={subnavVerticalClass(active, "rounded-md font-medium")}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

/* ───────────────────────── Shop overview (Master ID + identity) ───────────────────────── */

function ShopOverviewCard({ shop }: { shop: ShopProfileData }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shop.name);
  const [shopIdLabel, setShopIdLabel] = useState(shop.shopIdLabel ?? "");
  const [licenseNo, setLicenseNo] = useState(shop.licenseNo ?? "");
  const [taxId, setTaxId] = useState(shop.taxId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function copyMasterId() {
    await navigator.clipboard.writeText(shop.masterId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await updateShopProfile({ name, shopIdLabel, licenseNo, taxId });
      if (res.ok) setEditing(false);
      else setError(res.error);
    });
  }

  function cancel() {
    setName(shop.name);
    setShopIdLabel(shop.shopIdLabel ?? "");
    setLicenseNo(shop.licenseNo ?? "");
    setTaxId(shop.taxId ?? "");
    setError(null);
    setEditing(false);
  }

  const createdLabel = new Date(shop.masterIdCreatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const appUrl = `getshoprally.com/shop/${shop.id.slice(-6)}`;
  const tz = shopTimezone(shop.state);

  return (
    <div className="relative rounded-lg border bg-card p-4">
      <button
        type="button"
        onClick={() => (editing ? cancel() : setEditing(true))}
        aria-label={editing ? "Cancel" : "Edit shop details"}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {editing ? <X className="size-4" /> : <Pencil className="size-4" />}
      </button>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-3 pr-8">
        <div className="flex min-w-0 items-center gap-2">
          <KeyRound className="size-4 shrink-0 text-brand-navy" aria-hidden />
          {editing ? (
            <input
              className={cn(inputCls, "max-w-md font-medium")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : (
            <span className="truncate text-sm font-semibold">{shop.name}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <code
            className="rounded bg-muted px-2 py-0.5 font-mono font-semibold tracking-wide"
            title="Shop Master ID — use for ShopRally support, vendors, and billing"
          >
            {shop.masterId}
          </code>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={copyMasterId}>
            {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <CompactRow label="Shop code" value={shop.code} />
        <CompactRow label="Booking slug" value={shop.bookingSlug ?? "—"} mono />
        <CompactRow label="Master ID assigned" value={createdLabel} muted />
        <CompactRow
          label="Timezone"
          value={tz}
          mono
          hint={shop.state ? `From address (${shop.state})` : undefined}
        />
        <CompactRow
          label="Shop ID"
          value={
            editing ? (
              <input
                className={inputCls}
                value={shopIdLabel}
                onChange={(e) => setShopIdLabel(e.target.value)}
                placeholder="Add shop ID"
              />
            ) : (
              shop.shopIdLabel || "Add shop ID"
            )
          }
          muted={!shop.shopIdLabel && !editing}
        />
        <CompactRow
          label="License No."
          value={
            editing ? (
              <input
                className={inputCls}
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                placeholder="Add license no."
              />
            ) : (
              shop.licenseNo || "Add license no."
            )
          }
          muted={!shop.licenseNo && !editing}
        />
        <CompactRow
          label="Tax ID"
          value={
            editing ? (
              <input className={inputCls} value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Add tax ID" />
            ) : (
              shop.taxId || "Add tax ID"
            )
          }
          muted={!shop.taxId && !editing}
        />
        <CompactRow label="ShopRally URL" value={appUrl} />
        <CompactRow label="ShopRally ID" value={shop.id} mono muted />
      </dl>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {editing ? (
        <div className="mt-3 flex justify-end gap-2 border-t border-border/60 pt-3">
          <Button variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CompactRow({
  label,
  value,
  mono,
  muted,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm",
          mono && "font-mono text-xs",
          muted && "text-muted-foreground",
        )}
        title={hint}
      >
        {value}
      </dd>
    </div>
  );
}

/* ───────────────────────── Legacy row helper (forms) ───────────────────────── */

function SavedNote({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (saved) return <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="size-3.5" /> Saved</span>;
  return null;
}

function AddressForm({ shop }: { shop: ShopProfileData }) {
  const [f, setF] = useState({
    address: shop.address ?? "",
    address2: shop.address2 ?? "",
    city: shop.city ?? "",
    state: shop.state ?? "",
    zip: shop.zip ?? "",
  });
  const { saved, error, pending, run } = useSaver();

  return (
    <FormShell
      title="Update your shop address"
      desc="When changing your address, you are changing the address that is unique to this shop."
      onSave={() => run({ address: f.address, address2: f.address2, city: f.city, state: f.state, zip: f.zip })}
      saveLabel="Update Address"
      saved={saved}
      error={error}
      pending={pending}
    >
      <p className="text-sm text-muted-foreground">Enter the physical address location of your shop</p>
      <Field label="Address line 1" required>
        <input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="123 Main St" />
      </Field>
      <Field label="Address line 2">
        <input className={inputCls} value={f.address2} onChange={(e) => setF({ ...f, address2: e.target.value })} placeholder="Enter address line 2" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" required>
          <input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        </Field>
        <Field label="State / Province" required>
          <select className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Postal Code" required>
          <input className={inputCls} value={f.zip} onChange={(e) => setF({ ...f, zip: e.target.value })} />
        </Field>
      </div>
    </FormShell>
  );
}

/* ───────────────────────── Phone & Email ───────────────────────── */

function ContactForm({ shop }: { shop: ShopProfileData }) {
  const [f, setF] = useState({
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    website: shop.website ?? "",
  });
  const { saved, error, pending, run } = useSaver();

  return (
    <FormShell
      title="Update your shop contact info"
      desc="Your shop phone, email and website will be displayed to customers on estimates and invoices."
      onSave={() => run({ phone: f.phone, email: f.email, website: f.website })}
      saveLabel="Update Contact Info"
      saved={saved}
      error={error}
      pending={pending}
    >
      <Field label="Business Phone" required>
        <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(555) 555-5555" />
      </Field>
      <Field label="Business Email">
        <input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="shop@email.com" />
      </Field>
      <Field label="Business Website">
        <input className={inputCls} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://yourshop.com" />
      </Field>
    </FormShell>
  );
}

/* ───────────────────────── Logo ───────────────────────── */

function LogoForm({ shop }: { shop: ShopProfileData }) {
  const [logo, setLogo] = useState<string | null>(shop.logoUrl);
  const [fileName, setFileName] = useState<string | null>(shop.logoUrl ? "logo" : null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { saved, error, pending, run } = useSaver();
  const [localError, setLocalError] = useState<string | null>(null);

  function onFile(file: File | null) {
    setLocalError(null);
    if (!file) return;
    if (!/image\/(png|jpe?g)/.test(file.type)) {
      setLocalError("Please upload a JPG or PNG.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setLocalError("Image must be under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      setFileName(file.name);
      run({ logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    setLogo(null);
    setFileName(null);
    run({ logoUrl: null });
  }

  return (
    <div className="p-5">
      <h3 className="text-base font-semibold">Shop Logo</h3>
      <p className="mb-4 text-sm text-muted-foreground">Upload your shop logo to display on estimates and invoice print-outs.</p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center"
      >
        <UploadCloud className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Drag and drop files here, or</p>
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} Choose files to upload
        </Button>
        <p className="text-xs text-muted-foreground">JPG or PNG</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {logo ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="Shop logo" className="size-12 rounded object-contain" />
          <span className="flex-1 truncate text-sm">{fileName ?? "logo"}</span>
          <button type="button" onClick={remove} aria-label="Remove logo" className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="mt-3 min-h-[1rem]">
        <SavedNote saved={saved} error={localError ?? error} />
      </div>
    </div>
  );
}

/* ───────────────────────── Shared form bits ───────────────────────── */

function useSaver() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function run(patch: ShopProfilePatch) {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateShopProfile(patch);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }
  return { saved, error, pending, run };
}

function FormShell({
  title,
  desc,
  children,
  onSave,
  saveLabel,
  saved,
  error,
  pending,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel: string;
  saved: boolean;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div className="p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground">{desc}</p>
      <div className="space-y-4 border-t pt-4">{children}</div>
      <div className="mt-5 flex items-center justify-end gap-3 border-t pt-4">
        <SavedNote saved={saved} error={error} />
        <Button size="sm" onClick={onSave} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null} {saveLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}
