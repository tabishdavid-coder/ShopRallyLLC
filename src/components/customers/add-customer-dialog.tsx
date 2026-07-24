"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Tag,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import {
  validateCustomerForm,
  type CustomerFormType,
} from "@/components/customers/customer-form-shared";
import {
  CUSTOMER_INTAKE_FIELD,
  CustomerIntakeFieldLabel,
  CustomerIntakeFormSection,
  CustomerIntakeIconInput,
  CustomerIntakeIconSelect,
  CustomerIntakeTypeTabs,
} from "@/components/customers/customer-intake-form-chrome";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { US_STATES } from "@/lib/platform-shop-form";
import { formatPhoneInput } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { createCustomer } from "@/server/actions/customers";

const fieldClass = CUSTOMER_INTAKE_FIELD;
const FormSection = CustomerIntakeFormSection;
const FieldLabel = CustomerIntakeFieldLabel;
const IconInput = CustomerIntakeIconInput;
const IconSelect = CustomerIntakeIconSelect;

export type CustomerPrefill = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};

type Form = {
  firstName: string;
  lastName: string;
  company: string;
  displayName: string;
  phone: string;
  phoneType: string;
  email: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  customerLabel: string;
  preferredMobile: boolean;
  preferredEmail: boolean;
  notes: string;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  company: "",
  displayName: "",
  phone: "",
  phoneType: "Mobile",
  email: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  country: "USA",
  customerLabel: "",
  preferredMobile: true,
  preferredEmail: false,
  notes: "",
};

function autoDisplayName(
  type: CustomerFormType,
  form: Pick<Form, "firstName" | "lastName" | "company">,
) {
  if (type === "business" && form.company.trim()) return form.company.trim();
  return `${form.firstName} ${form.lastName}`.trim();
}

function OrangeToggle({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || "Toggle"}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand-orange justify-end" : "bg-[#d0d5dd] justify-start",
        )}
      >
        <span className="block size-5 shrink-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-1 ring-black/5" />
      </button>
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
    </div>
  );
}

export function AddCustomerDialog({
  onCreated,
  trigger,
  availableTags = [],
  defaultMarketingOptIn = false,
  prefill,
  open: controlledOpen,
  onOpenChange,
}: {
  onCreated?: (id: string, name: string) => void;
  trigger?: React.ReactNode;
  availableTags?: string[];
  defaultMarketingOptIn?: boolean;
  prefill?: CustomerPrefill;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [type, setType] = useState<CustomerFormType>("person");
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [activeStatus, setActiveStatus] = useState(true);

  const makeEmpty = (): Form => ({
    ...EMPTY,
    firstName: prefill?.firstName ?? "",
    lastName: prefill?.lastName ?? "",
    phone: prefill?.phone ? formatPhoneInput(prefill.phone) : "",
    email: prefill?.email ?? "",
  });

  const [form, setForm] = useState<Form>(makeEmpty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const computedDisplayName = useMemo(() => autoDisplayName(type, form), [type, form]);

  function openDialog() {
    setForm(makeEmpty());
    setType("person");
    setDisplayNameTouched(false);
    setActiveStatus(true);
    setError(null);
    setOpen(true);
  }

  useEffect(() => {
    if (open) {
      setForm(makeEmpty());
      setType("person");
      setDisplayNameTouched(false);
      setActiveStatus(true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh prefill when dialog opens
  }, [open, prefill?.firstName, prefill?.lastName, prefill?.phone, prefill?.email]);

  useEffect(() => {
    if (!displayNameTouched) {
      setForm((f) => ({ ...f, displayName: computedDisplayName }));
    }
  }, [computedDisplayName, displayNameTouched]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function reset() {
    setForm(makeEmpty());
    setType("person");
    setDisplayNameTouched(false);
    setActiveStatus(true);
    setError(null);
  }

  function submit() {
    setError(null);
    const validation = validateCustomerForm(type, form);
    if (validation) {
      setError(validation);
      return;
    }

    const addressParts = [form.address.trim(), form.addressLine2.trim()].filter(Boolean);
    const labelTag = form.customerLabel.trim();
    const tags = labelTag ? [labelTag] : [];

    // Map preferred contact → consent defaults (no separate consent UI in this layout)
    const transactionalSmsConsent = form.preferredMobile;
    const marketingEmailConsent = form.preferredEmail;
    const marketingOptIn = defaultMarketingOptIn;

    startTransition(async () => {
      const res = await createCustomer({
        type,
        firstName: form.firstName,
        lastName: form.lastName,
        company: form.company,
        phone: form.phone,
        email: form.email,
        address: addressParts.join(", ") || undefined,
        city: form.city,
        state: form.state,
        zip: form.zip,
        marketingOptIn,
        transactionalSmsConsent,
        marketingEmailConsent,
        notes: form.notes,
        tags,
      });
      if (res.ok) {
        const name = form.displayName.trim() || computedDisplayName;
        setOpen(false);
        reset();
        if (onCreated) onCreated(res.id, name);
        else router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  void availableTags;
  void activeStatus;

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        {trigger ? (
          <span onClick={openDialog}>{trigger}</span>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 bg-brand-orange text-white hover:bg-brand-orange/90"
            onClick={openDialog}
          >
            <UserPlus className="size-4" />
            Add Customer
          </Button>
        )}

        <DialogContent
          className="flex h-[min(92vh,880px)] max-h-[92vh] w-full flex-col gap-0 overflow-hidden rounded-none border border-[#eaecf0] bg-white p-0 shadow-2xl sm:max-w-[960px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        >
          {/* Header */}
          <div className="bg-white px-6 pb-4 pt-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-orange">
                <User className="size-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Create New Customer
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Add a new customer to your database
                </p>
              </div>
            </div>
          </div>

          <div className="px-6">
            <CustomerIntakeTypeTabs type={type} onChange={setType} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
            <div className="space-y-7">
              {/* Customer Information */}
              <FormSection icon={User} title="Customer Information">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FieldLabel label="First Name" required={type === "person"} />
                    <IconInput
                      icon={User}
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Last Name" required={type === "person"} />
                    <IconInput
                      icon={User}
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Display Name" required />
                    <IconInput
                      icon={Users}
                      value={form.displayName}
                      onChange={(e) => {
                        setDisplayNameTouched(true);
                        set("displayName", e.target.value);
                      }}
                      placeholder="How should this customer appear?"
                    />
                  </div>
                  <div>
                    <FieldLabel
                      label="Company Name"
                      required={type === "business"}
                      optional={type === "person"}
                    />
                    <IconInput
                      icon={Building2}
                      value={form.company}
                      onChange={(e) => set("company", e.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel label="Phone" />
                    <div className="flex h-10 overflow-hidden rounded-md border border-[#d0d5dd] bg-white focus-within:border-brand-orange/50 focus-within:ring-3 focus-within:ring-brand-orange/20">
                      <Select value={form.phoneType} onValueChange={(v) => set("phoneType", v)}>
                        <SelectTrigger className="h-full w-[118px] shrink-0 rounded-none border-0 border-r border-[#d0d5dd] bg-transparent px-2.5 text-sm shadow-none focus:ring-0">
                          <Phone className="mr-1.5 size-3.5 text-muted-foreground/60" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mobile">Mobile</SelectItem>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Work">Work</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={form.phone}
                        onChange={(e) => set("phone", formatPhoneInput(e.target.value))}
                        placeholder="(555) 123-4567"
                        inputMode="tel"
                        className="h-full rounded-none border-0 pl-3 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel label="Email" />
                    <IconInput
                      icon={Mail}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="name@email.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <FieldLabel label="Preferred Contact Method" />
                    <div className="flex flex-wrap gap-5 pt-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={form.preferredMobile}
                          onCheckedChange={(c) => set("preferredMobile", Boolean(c))}
                          className="size-4 rounded-[4px] border-[#d0d5dd] data-[state=checked]:border-brand-orange data-[state=checked]:bg-brand-orange"
                        />
                        Mobile
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={form.preferredEmail}
                          onCheckedChange={(c) => set("preferredEmail", Boolean(c))}
                          className="size-4 rounded-[4px] border-[#d0d5dd] data-[state=checked]:border-brand-orange data-[state=checked]:bg-brand-orange"
                        />
                        Email
                      </label>
                    </div>
                  </div>
                  <div>
                    <FieldLabel
                      label="Primary Contact"
                      info="Marks this as the primary contact for the account."
                    />
                    <label className="mt-1.5 inline-flex items-center gap-2 text-sm text-foreground">
                      <span
                        className="flex size-4 items-center justify-center rounded-full border-2 border-brand-orange"
                        aria-hidden
                      >
                        <span className="size-2 rounded-full bg-brand-orange" />
                      </span>
                      Primary
                    </label>
                  </div>
                  <div>
                    <FieldLabel label="Active Status" />
                    <div className="mt-1">
                      <OrangeToggle
                        checked={activeStatus}
                        onCheckedChange={setActiveStatus}
                        label="Active"
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              <div className="h-px bg-[#eaecf0]" />

              {/* Address */}
              <FormSection icon={MapPin} title="Address">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel label="Address Line 1" />
                    <Input
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Street address"
                      className={cn(fieldClass, "pl-3")}
                    />
                  </div>
                  <div>
                    <FieldLabel label="Address Line 2" optional />
                    <Input
                      value={form.addressLine2}
                      onChange={(e) => set("addressLine2", e.target.value)}
                      placeholder="Apt, suite, unit, etc."
                      className={cn(fieldClass, "pl-3")}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FieldLabel label="City" />
                    <IconInput
                      icon={Building2}
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <FieldLabel label="State / Province" />
                    <IconSelect
                      icon={MapPin}
                      value={form.state}
                      onValueChange={(v) => set("state", v)}
                      placeholder="State / Province"
                    >
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </IconSelect>
                  </div>
                  <div>
                    <FieldLabel label="Zip / Postal Code" />
                    <IconInput
                      icon={Mail}
                      value={form.zip}
                      onChange={(e) => set("zip", e.target.value)}
                      placeholder="ZIP / Postal code"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Country" />
                    <IconSelect
                      icon={Globe}
                      value={form.country}
                      onValueChange={(v) => set("country", v)}
                      placeholder="Country"
                    >
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Mexico">Mexico</SelectItem>
                    </IconSelect>
                  </div>
                </div>
              </FormSection>

              <div className="h-px bg-[#eaecf0]" />

              {/* Additional Information */}
              <FormSection icon={FileText} title="Additional Information">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <FieldLabel label="Customer Label" optional />
                    <IconInput
                      icon={Tag}
                      value={form.customerLabel}
                      onChange={(e) => set("customerLabel", e.target.value)}
                      placeholder="e.g., VIP, Referral, Fleet"
                    />
                  </div>
                  <div>
                    <FieldLabel label="Notes" optional />
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground/60" />
                      <Textarea
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        placeholder="Add any notes about this customer..."
                        className="min-h-[96px] resize-y rounded-md border-[#d0d5dd] bg-white pl-9 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:border-brand-orange/50 focus-visible:ring-brand-orange/20"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>

          <DialogFooter className="-mx-0 -mb-0 justify-end gap-3 border-t border-[#eaecf0] bg-white px-6 py-4">
            <Button
              variant="outline"
              className="h-10 border-[#d0d5dd] px-5"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              className="h-10 gap-2 bg-brand-orange px-5 text-white hover:bg-brand-orange/90"
              onClick={submit}
              disabled={pending}
            >
              <Save className="size-4" />
              {pending ? "Saving…" : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
