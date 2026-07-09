"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, CheckCircle2, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitDemoRequest } from "@/server/actions/marketing-leads";
import { SUPPORT_EMAIL } from "@/lib/support";

const BAY_OPTIONS = ["1–2 bays", "3–5 bays", "6–10 bays", "11+ bays"] as const;

export function DemoPageContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [bayCount, setBayCount] = useState("");
  const [currentSoftware, setCurrentSoftware] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitDemoRequest({
        name,
        email,
        shopName,
        phone: phone || undefined,
        bayCount: bayCount || undefined,
        currentSoftware: currentSoftware || undefined,
        message: message || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <CheckCircle2 className="mx-auto size-14 text-brand-navy" />
        <h1 className="mt-6 text-2xl font-bold text-brand-navy">We&apos;ll be in touch soon</h1>
        <p className="mt-3 text-slate-600">
          Thanks, {name.split(" ")[0] || "there"}. Our team will reach out at{" "}
          <span className="font-medium text-brand-navy">{email}</span> to schedule your personalized demo.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="bg-brand-navy" asChild>
            <Link href="/signup">Start free trial instead</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy/90 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-light">
              <Play className="size-3.5" />
              Personalized walkthrough
            </div>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
              See ShopRally in action
            </h1>
            <p className="mt-4 max-w-lg text-white/80 leading-relaxed">
              Book a demo with our team — we&apos;ll show you job board workflow, estimates, Growth Engine,
              and monthly ShopSite &amp; Local SEO add-ons based on how your shop runs.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              {[
                "30-minute live walkthrough",
                "In-depth training included on every plan",
                "Migration guidance from your current system",
                "Founding-shop pricing for early adopters",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-brand-light" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-2 text-brand-navy">
              <Calendar className="size-5" />
              <h2 className="text-lg font-bold">Request a demo</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Fill out the form and we&apos;ll email you to schedule a time.
            </p>

            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-name" className="text-slate-900">
                    Your name *
                  </Label>
                  <Input
                    id="demo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="demo-email" className="text-slate-900">
                    Email *
                  </Label>
                  <Input
                    id="demo-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-shop" className="text-slate-900">
                  Shop name *
                </Label>
                <Input
                  id="demo-shop"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  className="border-slate-300"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-phone" className="text-slate-900">
                    Phone
                  </Label>
                  <Input
                    id="demo-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-900">Shop size</Label>
                  <Select value={bayCount} onValueChange={setBayCount}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BAY_OPTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-current" className="text-slate-900">
                  Current shop software
                </Label>
                <Input
                  id="demo-current"
                  value={currentSoftware}
                  onChange={(e) => setCurrentSoftware(e.target.value)}
                  placeholder="Tekmetric, Shopmonkey, pen & paper…"
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-message" className="text-slate-900">
                  Anything else?
                </Label>
                <Textarea
                  id="demo-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="border-slate-300"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={pending}
                className="w-full gap-2 bg-brand-red hover:bg-brand-red/90"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Request demo
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-500">
              Prefer email?{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-navy hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
