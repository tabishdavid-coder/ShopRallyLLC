"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { ChecklistIconSvg, ShieldIcon } from "@/components/pricing/pricing-icons";
import {
  BOARD_COLS,
  CAPABILITY_DIFFS,
  CHECKLIST,
  MATRIX_COLS,
  PLAN_GLANCE,
  TIER_META,
  type DiffMark,
  type TierKey,
} from "@/components/pricing/pricing-data";
import styles from "@/components/pricing/pricing.module.css";
import {
  aiPlusMonthlyDollars,
  aiPlusPriceLabel,
  shoprallyIgnitionAiBundleMonthly,
  shoprallyStarterMonthly,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

function diffLabel(mark: DiffMark): string {
  switch (mark) {
    case "yes":
      return "✓";
    case "addon":
      return "AI+";
    case "pro":
      return "Pro";
    case "elite":
      return "Elite";
    default:
      return "–";
  }
}

function fmt2(n: number) {
  return `$${n.toFixed(2)}`;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useScrollReveal(reduced: boolean) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = [...root.querySelectorAll<HTMLElement>(`.${styles.rv}`)];
    if (reduced || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add(styles.in));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.in);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced]);
  return rootRef;
}

export function PricingPageContent() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useScrollReveal(reduced);
  const [annual, setAnnual] = useState(false);
  const [glanceTier, setGlanceTier] = useState<TierKey>("ignition");
  const [showCompare, setShowCompare] = useState(false);
  const [showFullChecklist, setShowFullChecklist] = useState(false);
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});
  const [parseBusy, setParseBusy] = useState(false);
  const [parseShow, setParseShow] = useState(false);
  const [parseLabel, setParseLabel] = useState("Parse with AI");
  const [txTyping, setTxTyping] = useState(true);
  const [txOut, setTxOut] = useState(false);
  const [approved, setApproved] = useState(false);
  const [wipGlow, setWipGlow] = useState(false);

  const monthly = shoprallyStarterMonthly(false);
  const annualMo = shoprallyStarterMonthly(true);
  const aiPlus = aiPlusMonthlyDollars();
  const bundleMo = shoprallyIgnitionAiBundleMonthly(false);
  const bundleAnnual = shoprallyIgnitionAiBundleMonthly(true);
  const pairLabel = shoprallyStarterPricePairLabel();
  const aiLabel = aiPlusPriceLabel();

  const faqs = useMemo(
    () => [
      [
        "How much does auto repair shop management software cost with ShopRally?",
        `Ignition founding pricing is ${pairLabel} — one all-in-one shop management plan with PartsTech, Carfax, two-way SMS, and Google Reviews inbox (sync & reply) included. Optional AI Plus is ${aiLabel}. Website & SEO is a separate companion offer on this page. Reserving a founding seat for Q4 2026 does not bill you today.`,
      ],
      [
        "Which plan should I choose?",
        `Ignition (${pairLabel}) is the plan we're launching in Q4 2026. Reserve a founding seat for unlimited users & ROs, the job board, full RO workspace, PartsTech, Carfax, two-way SMS, Google Reviews inbox, canned jobs & shop labor, digital estimates/approvals/invoices, digital vehicle inspections, Live Operations Daily Snapshot, appointments, payment tracking, unlimited NHTSA VIN decode, and inventory basics. Add AI Plus (${aiLabel}) for freeform AI intake, labor assist, and the advisor mobile app.`,
      ],
      [
        "What's not on Ignition yet?",
        "Licensed MOTOR, Stripe Connect card capture, Growth Engine campaigns, online booking, and review-request campaigns stay on the Ignition Pro+ roadmap. Care Plans, AI receptionist, and AI review-reply drafts are Ignition Elite. ShopSite and Local SEO are a separate product line — not buried in Ignition CRM pricing.",
      ],
      [
        "Are Google Reviews included on Ignition?",
        "Yes — Ignition includes the Google Reviews inbox: connect Google Business Profile, sync reviews into the CRM, and reply from one place. That's Ignition recognition tooling, not Growth Engine. Automated review-request campaigns after service are Ignition Pro+; AI-drafted review replies are Ignition Elite.",
      ],
      [
        "Can I get a website and SEO?",
        "Yes — ShopSite and Local SEO are available at launch as their own offer, billed separately from Ignition CRM. Hosted shop site, local SEO, Google Business Profile presence, and local Google Ads optimization when you're already running ads, plus a one-time launch build. We don't guarantee rankings or ROI.",
      ],
      [
        "Can I change plans anytime?",
        "Ignition is the only CRM plan on the founding waitlist for Q4 2026. Website & SEO is requested separately. When Ignition Pro and Ignition Elite open later, you'll be able to upgrade CRM — we'll announce that separately.",
      ],
      [
        "Is there a setup fee?",
        "No CRM setup fee on Ignition. Founding shops get priority onboarding help. ShopSite and Local SEO have a one-time launch setup when we build your site or SEO ($349 / $299, or $549 bundle).",
      ],
      [
        "What's included in the founding-shop pricing?",
        `Founding shops lock in Ignition launch rates (${pairLabel}) when we open — before public list pricing rises. Choose monthly or annual at launch. Priority walkthroughs and feedback access included. Reserving a seat does not bill you today.`,
      ],
      [
        "Are digital vehicle inspections included?",
        "Every plan includes full digital vehicle inspections — multi-point templates, red/yellow/green ratings, photo markup on findings, and share links so customers see results on their phone before approving work.",
      ],
      [
        "What's included in Operations Daily Snapshot?",
        "Every plan includes Live Operations Daily Snapshot — a clear view of today's and upcoming shop activity, so owners and advisors stay ahead of the day without digging through reports.",
      ],
      [
        "What's included for labor data?",
        "Licensed MOTOR labor data is included on Ignition Pro and Ignition Elite — flat-rate guides and procedures in the estimate. Ignition uses the shop labor library. OEM specs and fluid capacities are on Ignition Pro+.",
      ],
      [
        "How does VIN decoding work on Ignition?",
        "Ignition includes unlimited VIN decoding via free NHTSA vPIC — no monthly cap. Paid plate→VIN lookup is on Ignition Pro and Ignition Elite.",
      ],
      [
        "What about MOTOR labor guides?",
        "Licensed MOTOR flat-rate data is planned for Ignition Pro and Ignition Elite — not on Ignition. Ignition uses your shop labor library and canned jobs.",
      ],
      [
        "Do you integrate with PartsTech, Carfax, SMS, and QuickBooks?",
        "PartsTech and Nexpart catalog & punchout, Carfax service history, two-way SMS (Twilio), and Google Reviews inbox ship with Ignition at launch. QuickBooks and Stripe Connect stay on the later Ignition Pro / Ignition Elite roadmap.",
      ],
      [
        "How does additional locations work?",
        "Ignition is priced per shop location. Multi-location tooling and discounted add-on locations are part of the later roadmap — talk to us if you run more than one roof today.",
      ],
      [
        "Can I cancel anytime?",
        "Yes. Month-to-month billing with no long-term contract. Cancel anytime — service continues through your billing period.",
      ],
      [
        "Is training included?",
        "Ignition includes product guides and early demo support. Book a demo for a guided walkthrough of the bay loop. Dedicated white-glove onboarding is planned for Ignition Elite later.",
      ],
      [
        "Can I switch from another shop system?",
        "Yes. Founding shops get priority onboarding help. Formal white-glove migration packages are planned alongside later tiers — tell us what you're on today. We won't invent one-click imports that aren't built yet.",
      ],
    ],
    [aiLabel, pairLabel],
  );

  const ignitionItemCount = CHECKLIST.reduce((n, c) => n + c.items.length, 0);
  const glance = PLAN_GLANCE[glanceTier];

  // Two-way SMS typing loop
  useEffect(() => {
    if (reduced) {
      setTxTyping(false);
      setTxOut(true);
      return;
    }
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const loop = () => {
      setTxTyping(true);
      setTxOut(false);
      t1 = setTimeout(() => {
        setTxTyping(false);
        setTxOut(true);
      }, 1500);
    };
    t2 = setTimeout(loop, 1600);
    const iv = setInterval(loop, 5200);
    return () => {
      clearInterval(iv);
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [reduced]);

  // Approval loop with cleanup
  useEffect(() => {
    let glowTimer: ReturnType<typeof setTimeout> | undefined;
    let beatTimer: ReturnType<typeof setTimeout> | undefined;
    const approveBeat = () => {
      setApproved(true);
      setWipGlow(true);
      glowTimer = setTimeout(() => setWipGlow(false), 1800);
    };
    const resetBeat = () => setApproved(false);

    if (reduced) {
      approveBeat();
      return () => {
        if (glowTimer) clearTimeout(glowTimer);
      };
    }

    beatTimer = setTimeout(approveBeat, 2600);
    const iv = setInterval(() => {
      resetBeat();
      beatTimer = setTimeout(approveBeat, 2600);
    }, 7000);
    return () => {
      clearInterval(iv);
      if (glowTimer) clearTimeout(glowTimer);
      if (beatTimer) clearTimeout(beatTimer);
    };
  }, [reduced]);

  function onParse() {
    if (parseBusy) return;
    if (parseShow) {
      setParseShow(false);
      setParseLabel("Parse with AI");
      return;
    }
    setParseBusy(true);
    setParseLabel("Parsing…");
    window.setTimeout(
      () => {
        setParseBusy(false);
        setParseLabel("Draft ready ✓");
        setParseShow(true);
      },
      reduced ? 0 : 900,
    );
  }

  function tierPrice(key: "ignition" | "ai") {
    if (key === "ignition") return annual ? annualMo : monthly;
    return annual ? bundleAnnual : bundleMo;
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <section className={styles.priceband}>
        <div className={styles.ghosts} aria-hidden="true">
          <svg className={styles.ghost} style={{ top: "8%" }} width="200" height="110" viewBox="0 0 220 120" fill="none">
            <path d="M10 10 L70 60 L10 110 L44 110 L104 60 L44 10 Z" fill="#12294B" />
            <path d="M96 10 L156 60 L96 110 L130 110 L190 60 L130 10 Z" fill="#102544" />
          </svg>
          <svg className={styles.ghost} style={{ top: "68%" }} width="150" height="82" viewBox="0 0 220 120" fill="none">
            <path d="M10 10 L70 60 L10 110 L44 110 L104 60 L44 10 Z" fill="#0E2240" />
          </svg>
        </div>
        <div className={styles.wrap}>
          <div className={cn(styles.pbhead, styles.rv)}>
            <div className={styles.eyebrow}>Shop management software pricing</div>
            <h1>One plan to run the shop.</h1>
            <p>
              Transparent pricing for auto repair shop management software: <b>Ignition</b> with
              PartsTech, Carfax &amp; two-way SMS included. Launching Q4 2026.
            </p>
            <div className={styles.toggle} role="group" aria-label="Billing period">
              <button
                type="button"
                className={cn(styles.tgbtn, !annual && styles.on)}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                className={cn(styles.tgbtn, annual && styles.on)}
                onClick={() => setAnnual(true)}
              >
                Annual <span className={styles.tgsave}>Save 15%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(styles.sec, styles.tiersec)}>
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>Choose your plan</div>
            <h2>Two you can buy today. Two on the way.</h2>
            <p>
              Ignition is live now. Ignition Pro and Ignition Elite are the honest roadmap — shown
              here, not sold here.
            </p>
          </div>
          <div className={cn(styles.tiergrid, styles.rv)}>
            {TIER_META.map((t) => {
              const live = t.status === "live";
              const cls =
                t.key === "ignition" ? styles.ignition : t.standout ? styles.hero : undefined;
              return (
                <div
                  key={t.key}
                  className={cn(styles.tiercard, live ? styles.live : styles.roadmap, cls)}
                >
                  <div className={styles.tiername}>{t.name}</div>
                  <div className={styles.tiertag}>
                    {live ? "Live · reserve today" : "Roadmap · not sold today"}
                  </div>
                  {live ? (
                    <>
                      <div className={styles.tierprice}>
                        {fmt2(tierPrice(t.key as "ignition" | "ai"))}
                        <span>/mo</span>
                      </div>
                      <div className={styles.tiernote}>
                        {annual ? "Billed annually" : "Billed monthly"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={cn(styles.tierprice, styles.tbd)}>Pricing TBA</div>
                      <div className={styles.tiernote}>Opens after the Q4 2026 launch</div>
                    </>
                  )}
                  <div className={styles.tierdivider}>{t.lead}</div>
                  <ul className={styles.tierbullets}>
                    {t.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {t.more ? (
                    <a className={styles.tiermore} href="#full-checklist">
                      {t.more} ↓
                    </a>
                  ) : null}
                  <div className={styles.tierfoot}>
                    {live && t.href ? (
                      <Link className={cn(styles.tierctabtn, styles.on)} href={t.href}>
                        {t.cta}
                      </Link>
                    ) : (
                      <span className={cn(styles.tierctabtn, styles.off)}>{t.cta}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.sec} style={{ paddingTop: 10 }}>
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>Look closer</div>
            <h2>The features other plans charge extra for.</h2>
            <p>
              Six ship inside the {fmt2(monthly)} price — no upsell screen, no &quot;upgrade to
              unlock.&quot; Here&apos;s what&apos;s actually running underneath.
            </p>
          </div>
          <div className={cn(styles.spotgrid, styles.rv)}>
            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>Two-way text messaging</div>
              <div className={styles.spotdesc}>
                A real conversation thread on the RO — customers reply, you see it instantly, nothing
                gets lost in a voicemail.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.txthread}>
                  <span className={cn(styles.txb, styles.in)}>
                    Hey Danielle — brakes are done, ready for pickup whenever works today.
                  </span>
                  <span className={cn(styles.txb, styles.out, !txOut && styles.hidden)}>
                    Perfect, on my way now — thank you!
                  </span>
                  <span className={cn(styles.txtyping, !txTyping && styles.hidden)}>
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>
                    Gated behind AutoLeap Pro ($349), Tekmetric Scale ($439), and even Torque360 Turbo
                    ($179.99).
                  </b>{" "}
                  Included in Ignition at {fmt2(monthly)}.
                </p>
              </div>
            </div>

            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>Google Reviews inbox</div>
              <div className={styles.spotdesc}>
                Reviews land in the CRM, not a separate app. Sync from Google Business Profile and
                reply without leaving the shop board.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.revrow}>
                  <span className={styles.revav}>MS</span>
                  <div className={styles.revmain}>
                    <div className={styles.revname}>Maria Santos</div>
                    <div className={styles.revstars}>★★★★★</div>
                    <div className={styles.revtxt}>In and out fast, explained everything clearly.</div>
                  </div>
                </div>
                <div className={styles.revrow}>
                  <span className={styles.revav} style={{ background: "#0E8A5F" }}>
                    PO
                  </span>
                  <div className={styles.revmain}>
                    <div className={styles.revname}>Pat O&apos;Brien</div>
                    <div className={styles.revstars}>★★★★★</div>
                    <div className={styles.revtxt}>Fair price, no surprise add-ons at pickup.</div>
                  </div>
                </div>
                <div className={styles.revreply}>
                  <input placeholder="Reply from the CRM…" readOnly />
                  <button type="button">Send</button>
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>AutoLeap gates this behind Elite, $449/mo. Shopmonkey behind Genius, ~$449–499/mo.</b>{" "}
                  Ignition includes it from day one.
                </p>
              </div>
            </div>

            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>PartsTech + Nexpart ordering</div>
              <div className={styles.spotdesc}>
                Two supplier networks on the same estimate — search once, compare price and
                availability, punch the part onto the RO.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.partsearch}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span>Front brake pads — 2018 Honda CR-V</span>
                </div>
                <div className={styles.partrow}>
                  <span className={cn(styles.partsup, styles.pt)}>PartsTech</span>
                  <span className={styles.partname}>Wagner ThermoQuiet</span>
                  <span className={styles.partprice}>$42.60</span>
                </div>
                <div className={styles.partrow}>
                  <span className={cn(styles.partsup, styles.nx)}>Nexpart</span>
                  <span className={styles.partname}>Raybestos R-Line</span>
                  <span className={styles.partprice}>$38.10</span>
                </div>
                <div className={styles.partrow}>
                  <span className={cn(styles.partsup, styles.pt)}>PartsTech</span>
                  <span className={styles.partname}>Bosch QuietCast</span>
                  <span className={styles.partprice}>$51.90</span>
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>One supplier means one price.</b> Two networks on the same screen means you
                  actually get to compare.
                </p>
              </div>
            </div>

            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>Carfax vehicle history</div>
              <div className={styles.spotdesc}>
                The car&apos;s service history pulls onto the RO the moment the VIN is in — no
                separate lookup, no separate tab.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.cfhead}>
                  <span className={styles.cfshield}>
                    <ShieldIcon size={15} />
                  </span>
                  <div>
                    <div className={styles.cfvin}>2018 Honda CR-V · HZK-4821</div>
                    <div className={styles.cfsub}>Carfax history pulled at intake</div>
                  </div>
                </div>
                <div className={styles.cfrow}>
                  <span>Service records</span>
                  <b>9 on file</b>
                </div>
                <div className={styles.cfrow}>
                  <span>Accidents reported</span>
                  <b>None</b>
                </div>
                <div className={styles.cfrow}>
                  <span>Last serviced</span>
                  <b>Mar 2026</b>
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>Know the car before you write the estimate</b> — not after the customer asks
                  why.
                </p>
              </div>
            </div>

            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>Unlimited digital inspections</div>
              <div className={styles.spotdesc}>
                Build as many inspection templates as your shop needs — brake jobs, pre-purchase,
                seasonal, fleet — no cap, no upsell.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.dvigrid}>
                  {(
                    [
                      ["Multi-point", "eye"],
                      ["Brake job", "moon"],
                      ["Seasonal", "cal"],
                      ["Pre-purchase", "doc"],
                      ["Fleet check", "user"],
                      ["Your own", "add"],
                    ] as const
                  ).map(([label, kind]) => (
                    <div
                      key={label}
                      className={cn(styles.dvitile, kind === "add" && styles.add)}
                    >
                      <DviTileIcon kind={kind} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.dvicap}>
                  Ignition: <b>unlimited templates</b>
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>Shopmonkey&apos;s Basic plan caps you at 2 templates</b> — unlimited starts at
                  Clever, $359/mo.
                </p>
              </div>
            </div>

            <div className={styles.spotcard}>
              <span className={styles.spotbadge}>✓ Included in Ignition</span>
              <div className={styles.spottitle}>Live daily ops snapshot</div>
              <div className={styles.spotdesc}>
                Open the CRM and see the whole day at a glance — every morning, not just at the top
                tier.
              </div>
              <div className={styles.spotviz}>
                <div className={styles.snapgrid}>
                  {[
                    ["Open ROs", "12", "3 estimates"],
                    ["WIP today", "5", "2 same-day"],
                    ["Revenue", "$8.4k", "collected"],
                    ["Avg ticket", "$412", "this week"],
                  ].map(([l, v, s]) => (
                    <div key={l} className={styles.snaptile}>
                      <div className={styles.sl2}>
                        <i />
                        {l}
                      </div>
                      <div className={styles.sv2}>{v}</div>
                      <div className={styles.ss2}>{s}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.spotwin}>
                <ShieldIcon />
                <p>
                  <b>
                    AutoLeap holds this for Elite, $449/mo. Tekmetric holds it for Scale, $439/mo.
                  </b>{" "}
                  Every Ignition morning starts with it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sec}>
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>Where ShopRally fits</div>
            <h2>Not legacy. Not a bolt-on stack.</h2>
            <p>
              Legacy systems split workflow across desktop installs and agency retainers. Budget CRMs
              look cheap until the extras stack on.
            </p>
          </div>
          <div className={cn(styles.fitgrid, styles.rv)}>
            <div className={styles.fitcard}>
              <div className={styles.fitname}>Legacy CRM</div>
              <div className={styles.fitsub}>Mitchell, Protractor, desktop-first stacks</div>
              <div className={styles.fitprice}>
                $600–900<small>+/mo</small>
              </div>
              <div className={styles.fitcaption}>
                Labor guides, DVI, marketing &amp; website often separate
              </div>
              <ul className={styles.fitlist}>
                <li>Desktop installs, slow updates, IT overhead</li>
                <li>Marketing, website, and reviews live elsewhere</li>
                <li>Integrations need vendor tickets and custom projects</li>
                <li>Training is an extra line item — if offered at all</li>
              </ul>
            </div>
            <div className={styles.fitcard}>
              <div className={styles.fitname}>Budget cloud + bolt-ons</div>
              <div className={styles.fitsub}>Garage360, Torque360, entry CRM plus extras</div>
              <div className={styles.fitprice}>
                ~$279–524<small>/mo</small>
              </div>
              <div className={styles.fitcaption}>CRM + SMS + booking + reviews + agency SEO</div>
              <ul className={styles.fitlist}>
                <li>Sticker prices from $79/mo — until you need growth tools</li>
                <li>Marketing and website often sold separately</li>
                <li>Five logins, five invoices, five support contacts</li>
                <li>Feature maze across tiers and add-ons</li>
              </ul>
            </div>
            <div className={cn(styles.fitcard, styles.us)}>
              <div className={styles.fitname}>ShopRally Ignition</div>
              <div className={styles.fitsub}>One plan to run the bay — launching Q4 2026</div>
              <div className={styles.fitprice}>
                {fmt2(monthly)}
                <small>
                  mo · {fmt2(annualMo)} annual
                </small>
              </div>
              <div className={styles.fitcaption}>
                Ignition shop plan · AI Plus optional +{fmt2(aiPlus)}/mo
              </div>
              <ul className={styles.fitlist}>
                <li>Unlimited users &amp; ROs, job board, DVI, email &amp; SMS approvals</li>
                <li>PartsTech + Nexpart catalog &amp; punchout — no retyping parts</li>
                <li>Carfax service history on the vehicle / RO</li>
                <li>Two-way SMS &amp; Google Reviews inbox — included, not a Marketing add-on</li>
              </ul>
            </div>
          </div>
          <div className={cn(styles.comparelink, styles.rv)}>
            Comparing platforms?{" "}
            <Link href="/compare">ShopRally vs Tekmetric, Garage360, Torque360, and more →</Link>
          </div>
        </div>
      </section>

      <section className={styles.sec} style={{ paddingTop: 8 }} id="matrix">
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>Plans at a glance</div>
            <h2>What each plan actually includes.</h2>
            <p>
              Pick a plan to scan its highlights. Compare the high-signal diffs when you want side-by-side
              — full Ignition depth stays one tap away.
            </p>
          </div>

          <div className={cn(styles.glance, styles.rv)}>
            <div className={styles.glancetabs} role="tablist" aria-label="Plan highlights">
              {MATRIX_COLS.map((key) => {
                const g = PLAN_GLANCE[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={glanceTier === key}
                    className={cn(styles.glancetab, glanceTier === key && styles.on)}
                    onClick={() => setGlanceTier(key)}
                  >
                    {g.label}
                    <span className={styles.glancetabstat}>
                      {g.status === "live" ? "Live" : "Roadmap"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.glancepanel} role="tabpanel">
              <div className={styles.glancelead}>{glance.lead}</div>
              <ul className={styles.glancebullets}>
                {glance.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className={cn(styles.comparebox, styles.rv)}>
            <button
              type="button"
              className={styles.comparetoggle}
              aria-expanded={showCompare}
              onClick={() => setShowCompare((v) => !v)}
            >
              <span>
                <b>Compare plans</b>
                <span className={styles.comparehint}>
                  {CAPABILITY_DIFFS.length} high-signal diffs · Ignition through Ignition Elite
                </span>
              </span>
              <svg
                className={cn(styles.comparechev, showCompare && styles.open)}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {showCompare ? (
              <div className={styles.diffwrap}>
                <div className={styles.diffhead}>
                  <span className={styles.difffeature}>Capability</span>
                  {MATRIX_COLS.map((col) => (
                    <span key={col} className={styles.diffcol}>
                      {PLAN_GLANCE[col].label}
                    </span>
                  ))}
                </div>
                {CAPABILITY_DIFFS.map((row) => (
                  <div key={row.feature} className={styles.diffrow}>
                    <span className={styles.difffeature}>
                      {row.feature}
                      {row.note ? <i>{row.note}</i> : null}
                    </span>
                    {MATRIX_COLS.map((col) => {
                      const mark = row.cells[col];
                      return (
                        <span
                          key={col}
                          className={cn(
                            styles.diffcell,
                            mark === "yes" && styles.y,
                            mark === "addon" && styles.addon,
                            mark === "pro" && styles.pro,
                            mark === "elite" && styles.elite,
                            mark === "no" && styles.n,
                          )}
                        >
                          {diffLabel(mark)}
                        </span>
                      );
                    })}
                  </div>
                ))}
                <div className={styles.difflegend}>
                  <span>
                    <b className={styles.y}>✓</b> Included
                  </span>
                  <span>
                    <b className={styles.addon}>AI+</b> With AI Plus add-on
                  </span>
                  <span>
                    <b className={styles.pro}>Pro</b> Ignition Pro roadmap
                  </span>
                  <span>
                    <b className={styles.elite}>Elite</b> Ignition Elite roadmap
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className={cn(styles.fullcheck, styles.rv)} id="full-checklist">
            <button
              type="button"
              className={styles.fullchecktoggle}
              aria-expanded={showFullChecklist}
              onClick={() => setShowFullChecklist((v) => !v)}
            >
              <span>
                <b>See full Ignition checklist</b>
                <span className={styles.comparehint}>
                  {ignitionItemCount} launch items by category · optional depth
                </span>
              </span>
              <svg
                className={cn(styles.comparechev, showFullChecklist && styles.open)}
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {showFullChecklist ? (
              <div className={styles.fullcheckbody}>
                <p className={styles.fullcheckintro}>
                  Everything shipping inside Ignition at launch. Prefer a product tour?{" "}
                  <Link href="/features">Browse features →</Link>
                </p>
                {CHECKLIST.map((c) => (
                  <div key={c.name} className={styles.fullcat}>
                    <div className={styles.fullcathead}>
                      <span className={styles.caticon}>
                        <ChecklistIconSvg name={c.icon} />
                      </span>
                      <div>
                        <div className={styles.catname}>{c.name}</div>
                        <div className={styles.catsub}>{c.sub}</div>
                      </div>
                    </div>
                    <ul className={styles.fullcatlist}>
                      {c.items.map(([n, d]) => (
                        <li key={n}>
                          <b>{n}</b>
                          {d ? <span> — {d}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className={cn(styles.companion, styles.rv)}>
            Need a website too?{" "}
            <Link href="/pricing#website-seo">ShopSite &amp; Local SEO</Link> is a separate companion
            offer — its own tab, its own price.
          </div>
        </div>
      </section>

      <section className={cn(styles.sec, styles.aisec)} id="ai-plus">
        <div className={styles.wrap}>
          <div className={cn(styles.aicard, styles.rv)}>
            <div className={styles.aicopy}>
              <span className={styles.aitag2}>Optional add-on · +{fmt2(aiPlus)}/mo</span>
              <h3>Write it once, open a ready RO.</h3>
              <p>
                Paste a phone note or counter scribble. ShopRally drafts the vehicle, concerns, and
                labor hours — so advisors spend time with the customer, not the keyboard.{" "}
                <a href="#matrix" style={{ color: "var(--azure-deep)", fontWeight: 700, borderBottom: "1.5px solid var(--azure)" }}>
                  See everything AI Plus adds ↓
                </a>
              </p>
              <div className={styles.aiprice}>
                Ignition + AI Plus — <b>{fmt2(bundleMo)} monthly</b> · {fmt2(bundleAnnual)}{" "}
                annual. Stacks on Ignition only.
              </div>
              <div className={styles.aictas}>
                <Link className={styles.cta} href="/launch?ai=1">
                  Reserve Ignition + AI Plus
                </Link>
                <Link className={styles.ctalight} href="/launch">
                  Reserve Ignition only
                </Link>
              </div>
            </div>
            <div className={styles.aidemo}>
              <div className={styles.dlabel}>Smart AI intake</div>
              <div className={styles.dnote}>
                2014 Honda Accord — customer says brakes squeal in front, also wants oil change. About
                82k miles.
              </div>
              <button
                type="button"
                className={cn(styles.dbtn, parseBusy && styles.busy)}
                onClick={onParse}
              >
                {parseLabel}
              </button>
              <div className={cn(styles.dresult, parseShow && styles.show)}>
                <div className={styles.dchips}>
                  <span className={styles.dchip}>✓ Vehicle identified</span>
                  <span className={styles.dchip}>✓ 2 jobs drafted</span>
                  <span className={styles.dchip}>✓ Labor hours suggested</span>
                </div>
                <div className={styles.dveh}>
                  <div className={styles.dvname}>2014 Honda Accord</div>
                  <div className={styles.dvmiles}>82,000 mi</div>
                  <div className={styles.djob}>
                    <span className={styles.jn}>Front brake service</span>
                    <span className={styles.jh}>1.4 hrs</span>
                  </div>
                  <div className={styles.djob}>
                    <span className={styles.jn}>Oil change</span>
                    <span className={styles.jh}>0.4 hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(styles.sec, styles.opssec)}>
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>The platform</div>
            <h2>Daily Snapshot, board, and approvals.</h2>
            <p>See today&apos;s work, move ROs on the board, and get customer yes without phone tag.</p>
          </div>
          <div className={cn(styles.statrow, styles.rv)}>
            {[
              ["Open ROs", "12", "3 estimates"],
              ["WIP today", "5", "2 same-day"],
              ["Revenue", "$8.4k", "collected"],
              ["Avg ticket", "$412", "this week"],
            ].map(([l, v, s]) => (
              <div key={l} className={styles.stat}>
                <div className={styles.sl}>{l}</div>
                <div className={styles.sv}>{v}</div>
                <div className={styles.ss}>{s}</div>
              </div>
            ))}
          </div>
          <div className={cn(styles.opsgrid, styles.rv)}>
            <div className={styles.boardcard2}>
              <div className={styles.bctitle2}>
                Job board · drag ROs, same record estimate to paid
              </div>
              <div className={styles.bcols2}>
                {BOARD_COLS.map((col) => (
                  <div key={col.name}>
                    <div className={styles.bcolhead2} style={{ ["--cc" as string]: col.color }}>
                      {col.name} <span className={styles.n}>{col.ros.length}</span>
                    </div>
                    {col.ros.map((r) => (
                      <div
                        key={r.id}
                        className={styles.roc}
                        data-ro={r.id}
                        style={
                          r.id === "#1046" && wipGlow
                            ? {
                                boxShadow:
                                  "0 0 0 2px #0E8A5F, 0 4px 14px rgba(14,138,95,.3)",
                              }
                            : undefined
                        }
                      >
                        <div className={styles.rn}>{r.id}</div>
                        <div className={styles.rname}>{r.name}</div>
                        <div className={styles.rveh}>{r.veh}</div>
                        <div className={styles.ramt}>{r.amt}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.approvecard}>
              <div className={styles.aphead}>Customer approval · email link, no phone tag</div>
              <div className={styles.apbody}>
                <div className={styles.apname}>Luis Hernandez</div>
                <div className={styles.apveh}>2020 Chevy Silverado · Estimate sent · #1046</div>
                <div className={styles.apamt}>$1,240.00</div>
                <div className={cn(styles.apstate, approved && styles.ok)}>
                  {approved ? "Approved 9:41 AM" : "Awaiting approval"}
                </div>
                <div className={styles.apnote}>
                  {approved
                    ? "Customer opened the link on mobile. RO moved to WIP automatically — advisor notified."
                    : "Sent by email at 9:12 AM."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sec}>
        <div className={styles.wrap}>
          <div className={cn(styles.sechead, styles.rv)}>
            <div className={styles.eyebrow}>Common questions</div>
            <h2>Everything you&apos;d ask before reserving.</h2>
          </div>
          <div className={cn(styles.faqlist, styles.rv)}>
            {faqs.map(([q, a], i) => {
              const open = !!openFaqs[i];
              return (
                <div key={q} className={cn(styles.faqitem, open && styles.open)}>
                  <button
                    type="button"
                    className={styles.faqq}
                    aria-expanded={open}
                    onClick={() => setOpenFaqs((prev) => ({ ...prev, [i]: !prev[i] }))}
                  >
                    <span>{q}</span>
                    <svg
                      className={styles.fqchev}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  <div className={styles.faqa}>
                    <p>{a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={cn(styles.sec, styles.door)}>
        <div className={cn(styles.wrap, styles.rv)}>
          <div className={styles.eyebrow}>Q4 2026</div>
          <h2>Reserve Ignition for Q4 2026</h2>
          <p>Launching Q4 2026 · we&apos;ll invite you at launch</p>
          <div className={styles.doorctas}>
            <Link className={styles.cta} href="/launch">
              Reserve a founding seat
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link className={styles.ctaghost} href="/demo">
              See the 3-minute walkthrough
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function DviTileIcon({ kind }: { kind: string }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: kind === "add" ? 2.6 : 2.1,
  };
  if (kind === "eye")
    return (
      <svg {...common}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  if (kind === "moon")
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  if (kind === "cal")
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    );
  if (kind === "doc")
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  if (kind === "user")
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
