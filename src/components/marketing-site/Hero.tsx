"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

import styles from "./Hero.module.css";

const money = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ROSTER = [
  {
    ro: "RO-1047",
    who: "DANIELLE R.",
    jobs: "3 jobs drafted with PartsTech",
    amt: 694.2,
    declined: "cabin filter",
  },
  {
    ro: "RO-1048",
    who: "MARCUS B.",
    jobs: "2 jobs drafted with PartsTech",
    amt: 985.44,
    declined: "wiper blades",
  },
  {
    ro: "RO-1049",
    who: "SANDRA L.",
    jobs: "2 jobs drafted with PartsTech",
    amt: 509.11,
    declined: "air filter",
  },
] as const;

type CircuitNode = {
  key: string;
  a: string;
  label: string;
  strokeWidth: string;
  icon: ReactNode;
};

const CIRCUIT_NODES: CircuitNode[] = [
  {
    key: "estimate",
    a: "0deg",
    label: "Estimate",
    strokeWidth: "2.2",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    key: "approval",
    a: "60deg",
    label: "Approval",
    strokeWidth: "2.2",
    icon: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-9.4 8.3 8.6 8.6 0 0 1-3.1-.8L3 21l2-5.5a8.4 8.4 0 1 1 16-4Z" />
        <path d="m9 11 2 2 4-4" />
      </>
    ),
  },
  {
    key: "progress",
    a: "120deg",
    label: "In progress",
    strokeWidth: "2.2",
    icon: (
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7Z" />
    ),
  },
  {
    key: "completed",
    a: "180deg",
    label: "Completed",
    strokeWidth: "2.6",
    icon: <path d="M20 6 9 17l-5-5" />,
  },
  {
    key: "invoiced",
    a: "240deg",
    label: "Invoiced",
    strokeWidth: "2.2",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
  },
  {
    key: "paid",
    a: "300deg",
    label: "Paid",
    strokeWidth: "2.2",
    icon: (
      <path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.7 5 3.4 5 1.6 5 3.6-2.2 3-5 3-5-1.1-5-3" />
    ),
  },
];

function drawTicks(g: SVGGElement) {
  let d = "";
  for (let a = 0; a < 360; a += 10) {
    if (
      [0, 60, 120, 180, 240, 300].some(
        (n) =>
          Math.abs((((a - n) % 360) + 360) % 360) < 14 ||
          Math.abs((((n - a) % 360) + 360) % 360) < 14,
      )
    ) {
      continue;
    }
    const rad = ((a - 90) * Math.PI) / 180;
    const cx = 260 + 188 * Math.cos(rad);
    const cy = 260 + 188 * Math.sin(rad);
    const t = (a * Math.PI) / 180;
    const ux = Math.cos(t);
    const uy = Math.sin(t);
    const px = -Math.sin(t) * 4.5;
    const py = Math.cos(t) * 4.5;
    d += `M ${cx - ux * 5 + px} ${cy - uy * 5 + py} L ${cx + ux * 2} ${cy + uy * 2} L ${cx - ux * 5 - px} ${cy - uy * 5 - py} `;
  }
  g.innerHTML = `<path d="${d}"/>`;
}

export function Hero() {
  const cycleRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<SVGCircleElement>(null);
  const ticksRef = useRef<SVGGElement>(null);
  const hroRef = useRef<HTMLDivElement>(null);
  const hstageRef = useRef<HTMLDivElement>(null);
  const hcapRef = useRef<HTMLDivElement>(null);
  const hpaidRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cycle = cycleRef.current;
    const orbit = orbitRef.current;
    const prog = progRef.current;
    const ticks = ticksRef.current;
    const hro = hroRef.current;
    const hstage = hstageRef.current;
    const hcap = hcapRef.current;
    const hpaid = hpaidRef.current;
    const nodes = nodesRef.current.filter(Boolean) as HTMLDivElement[];

    if (!cycle || !orbit || !prog || !ticks || !hro || !hstage || !hcap || !hpaid) {
      return;
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    drawTicks(ticks);

    const C = 2 * Math.PI * 188;
    prog.setAttribute("stroke-dasharray", String(C));
    prog.setAttribute("stroke-dashoffset", String(C));

    if (reduced) {
      nodes.forEach((n) => n.classList.add(styles.lit));
      prog.setAttribute("stroke-dashoffset", "0");
      hstage.textContent = "Estimate → Paid";
      hcap.innerHTML =
        "The whole repair-order cycle in one login — and declined work loops back.";
      return;
    }

    let cancelled = false;
    let lap = 0;
    let paidToday = 1318.4;
    const timeouts: number[] = [];
    let snapRaf = 0;

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timeouts.push(id);
    };

    function setStage(i: number, key: string, name: string, cap: string) {
      cycle!.dataset.stage = key;
      orbit!.style.transform = `rotate(${i * 60}deg)`;
      prog!.setAttribute("stroke-dashoffset", String(C * (1 - (i * 60) / 360)));
      nodes.forEach((n, idx) => {
        n.classList.toggle(styles.lit, idx < i);
        n.classList.toggle(styles.cur, idx === i && key !== "paid");
        n.classList.toggle(styles.paidlit, idx === i && key === "paid");
      });
      hstage!.textContent = name;
      hcap!.innerHTML = cap;
    }

    function playLap() {
      if (cancelled) return;
      const r = ROSTER[lap % ROSTER.length];
      hro!.textContent = `${r.ro} · ${r.who}`;

      const steps: { at: number; run: () => void }[] = [
        {
          at: 0,
          run() {
            orbit!.classList.add(styles.snap);
            setStage(0, "estimate", "Estimate", `${r.jobs} · <b>${money(r.amt)}</b>`);
            if (snapRaf) cancelAnimationFrame(snapRaf);
            snapRaf = requestAnimationFrame(() => {
              snapRaf = 0;
              if (!cancelled) orbit!.classList.remove(styles.snap);
            });
          },
        },
        {
          at: 2400,
          run() {
            setStage(1, "approval", "Approval", "Estimate sent by text — approve each job");
          },
        },
        {
          at: 4200,
          run() {
            hcap!.innerHTML = `Viewed by ${r.who
              .split(" ")[0]
              .toLowerCase()
              .replace(/^./, (c) => c.toUpperCase())} — deciding…`;
          },
        },
        {
          at: 6200,
          run() {
            hcap!.innerHTML = `Approved <b>2 of 3</b> — ${r.declined} → recovery`;
            cycle!.classList.add(styles.rpulse);
            later(() => cycle!.classList.remove(styles.rpulse), 1600);
          },
        },
        {
          at: 8000,
          run() {
            setStage(2, "progress", "In progress", "Auto-moved — parts in · bay 2");
          },
        },
        {
          at: 10400,
          run() {
            setStage(3, "completed", "Completed", "QC passed — ready for pickup");
          },
        },
        {
          at: 12500,
          run() {
            setStage(4, "invoiced", "Invoiced", "Invoice sent with a pay link");
          },
        },
        {
          at: 14600,
          run() {
            setStage(
              5,
              "paid",
              "Paid",
              `<b>${money(r.amt)}</b> collected — booked for the next visit`,
            );
            later(() => {
              paidToday += r.amt;
              hpaid!.textContent = money(paidToday);
            }, 500);
          },
        },
        {
          at: 17200,
          run() {
            orbit!.style.transform = "rotate(360deg)";
            prog!.setAttribute("stroke-dashoffset", "0");
          },
        },
        {
          at: 18800,
          run() {
            lap++;
            playLap();
          },
        },
      ];
      steps.forEach((s) => later(s.run, s.at));
    }

    playLap();

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      if (snapRaf) cancelAnimationFrame(snapRaf);
    };
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.ghosts} aria-hidden="true">
        <svg className={styles.ghost} style={{ top: "12%" }} width="220" height="120" viewBox="0 0 220 120" fill="none">
          <path d="M10 10 L70 60 L10 110 L44 110 L104 60 L44 10 Z" fill="#12294B" />
          <path d="M96 10 L156 60 L96 110 L130 110 L190 60 L130 10 Z" fill="#102544" />
        </svg>
        <svg className={styles.ghost} style={{ top: "58%" }} width="170" height="95" viewBox="0 0 220 120" fill="none">
          <path d="M10 10 L70 60 L10 110 L44 110 L104 60 L44 10 Z" fill="#102544" />
        </svg>
        <svg className={styles.ghost} style={{ top: "82%" }} width="120" height="66" viewBox="0 0 220 120" fill="none">
          <path d="M10 10 L70 60 L10 110 L44 110 L104 60 L44 10 Z" fill="#0E2240" />
        </svg>
      </div>

      <div className={styles.grid}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>Ignition · launching Q4 2026</div>

          <h1 className={styles.title}>
            Auto repair software that runs the bay and the counter from{" "}
            <span className={styles.oneboard}>
              one board
              <svg viewBox="0 0 120 16" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M2 13 L16 3 L30 13"
                  stroke="#FF7A1A"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M44 13 L58 3 L72 13"
                  stroke="#1E7FE0"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M86 13 L100 3 L114 13"
                  stroke="#5B7AA6"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            .
          </h1>

          <p className={styles.sub}>
            Built by a shop owner. <b>ShopRally Ignition</b> is the whole shop in one login — job
            board, estimates with PartsTech punchout, digital inspections with{" "}
            <b>CARFAX history</b>, <b>two-way texting</b> so customers approve from their phone,
            appointments, and payment tracking.
          </p>

          <div className={styles.ctarow}>
            <Link className={styles.cta} href="/launch">
              Reserve a founding seat
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link className={styles.ctaghost} href="/demo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5Z" />
              </svg>
              See the 3-min walkthrough
            </Link>
          </div>
          <div className={styles.micro}>
            Free to reserve · no card · we invite you at the Q4 2026 launch
          </div>

          <div className={styles.switchstrip}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1E7FE0" strokeWidth="2.3">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <div className={styles.st}>
              <b>Switching from Tekmetric, Shopmonkey, or Mitchell?</b> Founding shops get
              priority cutover help — <span>tell us what you use today and we&apos;ll plan the
              move. We won&apos;t invent one-click imports that aren&apos;t built yet.</span>
            </div>
          </div>
        </div>

        <div className={styles.boardwrap}>
          <div className={styles.halo} aria-hidden="true" />
          <div className={styles.cycle} ref={cycleRef} data-stage="estimate">
            <svg className={styles.ring} viewBox="0 0 520 520" aria-hidden="true">
              <circle className={styles.track} cx="260" cy="260" r="188" />
              <g className={styles.ticks} ref={ticksRef} />
              <circle className={styles.prog} ref={progRef} cx="260" cy="260" r="188" />
              <path
                className={styles.recov}
                d="M 390.2 185.0 A 150 150 0 0 0 275.7 110.8"
              />
              <path
                className={styles.recovhead}
                d="M 275.7 110.8 l 13 -5.5 -2.5 12.5 Z"
                transform="rotate(8 275.7 110.8)"
              />
            </svg>
            <div className={styles.orbit} ref={orbitRef}>
              <span className={styles.comet}>
                <svg width="30" height="16" viewBox="0 0 30 16" fill="none">
                  <path
                    d="M2 2 L8 8 L2 14"
                    stroke="#FFC08A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 2 L17 8 L11 14"
                    stroke="#FF9A4D"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 2 L26 8 L20 14"
                    stroke="#FF7A1A"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            {CIRCUIT_NODES.map((n, idx) => (
              <div
                key={n.key}
                className={styles.node}
                data-node={n.key}
                style={{ ["--a" as string]: n.a }}
                ref={(el) => {
                  nodesRef.current[idx] = el;
                }}
              >
                <span className={styles.nb}>
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={n.strokeWidth}
                  >
                    {n.icon}
                  </svg>
                </span>
                <span className={styles.nl}>{n.label}</span>
              </div>
            ))}

            <div className={styles.hub}>
              <div className={styles.hro} ref={hroRef}>
                RO-1047 · DANIELLE R.
              </div>
              <div className={styles.hstage} ref={hstageRef}>
                Estimate
              </div>
              <div
                className={styles.hcap}
                ref={hcapRef}
                dangerouslySetInnerHTML={{
                  __html: "3 jobs drafted with PartsTech · <b>$694.20</b>",
                }}
              />
              <div className={styles.hdiv} />
              <div className={styles.hpaidlab}>Paid today</div>
              <div className={styles.hpaid} ref={hpaidRef}>
                $1,318.40
              </div>
            </div>
            <div className={styles.recovtag}>↻ Declined-work recovery</div>
          </div>

          <div className={styles.boardcaption}>
            <span className={styles.livedot}>
              <i />
              Live
            </span>
            Every stage, one system — declined work loops back instead of leaking.
            <Link href="/demo">
              Try the live board
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
