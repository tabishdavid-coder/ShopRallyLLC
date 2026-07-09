"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateOnlineBooking } from "@/server/actions/shop";

export function BookingSettings({
  initial,
  bookingUrl,
  embedIframe,
  embedLink,
}: {
  initial: {
    onlineBookingEnabled: boolean;
    bookingSlug: string | null;
    code: string;
  };
  bookingUrl: string;
  embedIframe: string;
  embedLink: string;
}) {
  const [enabled, setEnabled] = useState(initial.onlineBookingEnabled);
  const [slug, setSlug] = useState(initial.bookingSlug ?? slugify(initial.code));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateOnlineBooking({
        onlineBookingEnabled: enabled,
        bookingSlug: slug.trim().toLowerCase(),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Online Booking</h2>
        <p className="text-sm text-muted-foreground">
          Let customers book appointments from your website. Appointments appear on your calendar
          and create customer profiles automatically.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="booking-enabled"
            checked={enabled}
            onCheckedChange={(v) => setEnabled(v === true)}
          />
          <Label htmlFor="booking-enabled" className="cursor-pointer font-medium">
            Enable online booking
          </Label>
        </div>

        <div>
          <Label className="mb-1 block text-sm font-medium">Booking URL slug</Label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">/book/</span>
            <Input
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="your-shop-name"
              className="font-mono text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Lowercase letters, numbers, and hyphens only. Your shop code ({initial.code}) also works
            as a fallback.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          {error ? <span className="mr-auto text-xs text-destructive">{error}</span> : null}
          {saved ? (
            <span className="mr-auto flex items-center gap-1 text-xs text-emerald-600">
              <Check className="size-3.5" /> Saved
            </span>
          ) : null}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </div>

      {enabled ? (
        <>
          <EmbedBlock
            title="Public booking link"
            description="Share this link on your website, Google Business Profile, or social media."
            code={bookingUrl}
            copyKey="url"
            copied={copied}
            onCopy={copy}
            extra={
              <Button variant="outline" size="sm" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" /> Preview
                </a>
              </Button>
            }
          />

          <EmbedBlock
            title="Embed on your website (iframe)"
            description="Paste this iframe into any page on your site. Works well in a dedicated “Book Now” section."
            code={embedIframe}
            copyKey="iframe"
            copied={copied}
            onCopy={copy}
          />

          <EmbedBlock
            title="Book Now button"
            description="Add this link to any button on your site to open the booking page in a new tab."
            code={embedLink}
            copyKey="link"
            copied={copied}
            onCopy={copy}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enable online booking above to get your share link and embed code.
        </p>
      )}
    </div>
  );
}

function EmbedBlock({
  title,
  description,
  code,
  copyKey,
  copied,
  onCopy,
  extra,
}: {
  title: string;
  description: string;
  code: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          {extra}
          <Button variant="outline" size="sm" onClick={() => onCopy(code, copyKey)}>
            {copied === copyKey ? (
              <>
                <Check className="size-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
