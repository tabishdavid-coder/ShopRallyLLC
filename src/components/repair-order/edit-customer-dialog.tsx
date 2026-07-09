"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CrmDialogHeaderBar } from "@/components/crm/crm-form-field";
import { CrmFormField } from "@/components/crm/crm-form-field";
import { CrmFormSection } from "@/components/crm/crm-form-section";
import {
  CustomerFormCollapsible,
  CustomerTagPicker,
  PersonBusinessToggle,
  customerFieldInputClass,
  validateCustomerForm,
  type CustomerFormType,
  type EditableCustomerRecord,
} from "@/components/customers/customer-form-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatPhoneInput } from "@/lib/phone";
import { CustomerConsentCheckboxes } from "@/components/customers/customer-consent-checkboxes";
import { updateCustomer } from "@/server/actions/customers";
import type { RepairOrderDetail } from "@/server/repair-order";

type Form = {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  phoneType: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  marketingOptIn: boolean;
  transactionalSmsConsent: boolean;
  marketingEmailConsent: boolean;
  notes: string;
  tags: string[];
};

function customerToForm(c: EditableCustomerRecord): { type: CustomerFormType; form: Form } {
  const ext = c as EditableCustomerRecord & {
    transactionalSmsConsent?: boolean;
    marketingEmailConsent?: boolean;
  };
  return {
    type: c.company ? "business" : "person",
    form: {
      firstName: c.firstName,
      lastName: c.lastName,
      company: c.company ?? "",
      phone: c.phone ? formatPhoneInput(c.phone) : "",
      phoneType: "Mobile",
      email: c.email ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      zip: c.zip ?? "",
      marketingOptIn: c.marketingOptIn,
      transactionalSmsConsent: ext.transactionalSmsConsent ?? false,
      marketingEmailConsent: ext.marketingEmailConsent ?? false,
      notes: c.notes ?? "",
      tags: c.tags ?? [],
    },
  };
}

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  availableTags = [],
}: {
  customer: EditableCustomerRecord | RepairOrderDetail["customer"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTags?: string[];
}) {
  const router = useRouter();
  const seed = customerToForm(customer);
  const [type, setType] = useState<CustomerFormType>(seed.type);
  const [form, setForm] = useState<Form>(seed.form);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (t: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
    }));

  function reset() {
    const s = customerToForm(customer);
    setType(s.type);
    setForm(s.form);
    setError(null);
  }

  function submit() {
    setError(null);
    const validation = validateCustomerForm(type, form);
    if (validation) {
      setError(validation);
      return;
    }
    startTransition(async () => {
      const res = await updateCustomer({ id: customer.id, type, ...form });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent
        className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-lg"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <CrmDialogHeaderBar title="Edit customer" description="Update contact info, tags, and notes." />

        <div className="max-h-[min(60vh,520px)] space-y-4 overflow-y-auto p-5">
          <PersonBusinessToggle type={type} onChange={setType} />

          <CrmFormSection title={type === "person" ? "Contact" : "Business"} accent="navy">
            {type === "person" ? (
              <div className="grid grid-cols-2 gap-3">
                <CrmFormField label="First name" required>
                  <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={customerFieldInputClass} />
                </CrmFormField>
                <CrmFormField label="Last name" required>
                  <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={customerFieldInputClass} />
                </CrmFormField>
              </div>
            ) : (
              <CrmFormField label="Business name" required>
                <Input value={form.company} onChange={(e) => set("company", e.target.value)} className={customerFieldInputClass} />
              </CrmFormField>
            )}

            <div className="mt-3 grid grid-cols-[1fr_120px] gap-3">
              <CrmFormField label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", formatPhoneInput(e.target.value))}
                  inputMode="tel"
                  className={customerFieldInputClass}
                />
              </CrmFormField>
              <CrmFormField label="Type">
                <Select value={form.phoneType} onValueChange={(v) => set("phoneType", v)}>
                  <SelectTrigger className={customerFieldInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Home">Home</SelectItem>
                    <SelectItem value="Work">Work</SelectItem>
                  </SelectContent>
                </Select>
              </CrmFormField>
            </div>

            <div className="mt-3">
              <CrmFormField label="Email">
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} className={customerFieldInputClass} />
              </CrmFormField>
            </div>
          </CrmFormSection>

          <CustomerFormCollapsible title="Address">
            <CrmFormField label="Address line 1">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} className={customerFieldInputClass} />
            </CrmFormField>
            <div className="grid grid-cols-[1fr_80px_100px] gap-3">
              <CrmFormField label="City">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} className={customerFieldInputClass} />
              </CrmFormField>
              <CrmFormField label="State">
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} className={customerFieldInputClass} />
              </CrmFormField>
              <CrmFormField label="Zip">
                <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} className={customerFieldInputClass} />
              </CrmFormField>
            </div>
          </CustomerFormCollapsible>

          <CustomerFormCollapsible title="Additional info" defaultOpen>
            <CustomerTagPicker availableTags={availableTags} selected={form.tags} onToggle={toggleTag} />
            <CustomerConsentCheckboxes
              transactionalSmsConsent={form.transactionalSmsConsent}
              marketingOptIn={form.marketingOptIn}
              marketingEmailConsent={form.marketingEmailConsent}
              onTransactionalChange={(v) => set("transactionalSmsConsent", v)}
              onMarketingSmsChange={(v) => set("marketingOptIn", v)}
              onMarketingEmailChange={(v) => set("marketingEmailConsent", v)}
            />
            <CrmFormField label="Notes">
              <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} className={customerFieldInputClass} />
            </CrmFormField>
          </CustomerFormCollapsible>

          {error ? <p className="text-sm text-brand-red">{error}</p> : null}
        </div>

        <DialogFooter className="border-t border-brand-light/30 px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button className="bg-brand-navy hover:bg-brand-navy/90" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
