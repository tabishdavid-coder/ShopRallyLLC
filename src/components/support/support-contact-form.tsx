"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Mail, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSupportTicket,
  getSupportFormDefaults,
} from "@/server/actions/support";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/support";

export function SupportContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    getSupportFormDefaults().then((d) => {
      setName(d.name);
      setEmail(d.email);
    });
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const res = await createSupportTicket({ name, email, subject, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setSubject("");
      setBody("");
    });
  }

  return (
    <div id="contact-form" className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10">
          <MessageCircle className="size-5 text-brand-navy" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Contact support</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a ticket and we&apos;ll get back to you within one business day. You can also
            email {SUPPORT_EMAIL} or call {SUPPORT_PHONE}.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="support-name">Name</Label>
            <Input
              id="support-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="support-email">Email</Label>
            <Input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="support-subject">Subject</Label>
          <Input
            id="support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="support-body">Message</Label>
          <Textarea
            id="support-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Describe what you need help with…"
            required
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="text-sm text-emerald-700">
            Ticket submitted — thank you! We&apos;ll reply to {email}.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="bg-brand-navy" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Submit ticket"}
          </Button>
          <a
            href="mailto:info@getshoprally.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Mail className="size-3.5" />
            info@getshoprally.com
          </a>
        </div>
      </form>

      <p className="mt-4 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Live chat coming soon. For urgent billing issues, email info@getshoprally.com with your shop name.
      </p>
    </div>
  );
}
