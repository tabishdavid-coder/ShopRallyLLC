"use client";

import type { CSSProperties } from "react";

import styles from "./IntegrationsRing.module.css";

const PARTNERS = [
  { name: "PartsTech", cat: "Parts", a: "0deg", bd: "#F26B21", delay: "0.05s" },
  { name: "CARFAX", cat: "History", a: "45deg", bd: "#F5C518", delay: "0.13s" },
  { name: "Nexpart", cat: "Parts", a: "90deg", bd: "#C22026", delay: "0.21s" },
  { name: "Stripe", cat: "Payments", a: "135deg", bd: "#635BFF", delay: "0.29s" },
  { name: "Twilio", cat: "Texting", a: "180deg", bd: "#F22F46", delay: "0.37s" },
  { name: "RepairLink", cat: "OEM parts", a: "225deg", bd: "#4A5568", delay: "0.45s" },
  { name: "Auto.dev", cat: "VIN decode", a: "270deg", bd: "#2563EB", delay: "0.53s" },
  { name: "NHTSA vPIC", cat: "Vehicle data", a: "315deg", bd: "#1B4FA0", delay: "0.61s" },
] as const;

type IntegrationsRingProps = {
  /** Hide footer micro-copy when the dedicated page covers partner scope elsewhere. */
  showMicro?: boolean;
  className?: string;
};

export function IntegrationsRing({ showMicro = true, className }: IntegrationsRingProps) {
  return (
    <section id="integrations" className={[styles.section, className].filter(Boolean).join(" ")}>
      <div className={styles.frame}>
        <div className={styles.eyebrow}>Integrations</div>
        <h2 className={styles.title}>
          Every tool your shop
          <span className={styles.titleAccent}>already trusts.</span>
        </h2>

        <div
          className={styles.ringwrap}
          role="img"
          aria-label="ShopRally at the center of its integration partners"
        >
          <svg className={styles.dashring} viewBox="0 0 100 100" aria-hidden="true">
            <g className={styles.dashringSpin}>
              <circle cx="50" cy="50" r="40.5" />
            </g>
          </svg>

          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className={styles.itile}
              style={
                {
                  "--a": p.a,
                  "--bd": p.bd,
                  animationDelay: p.delay,
                } as CSSProperties
              }
            >
              <i className={styles.idot} aria-hidden="true" />
              <b className={styles.iname}>{p.name}</b>
              <small className={styles.icat}>{p.cat}</small>
            </div>
          ))}

          <div className={styles.core}>
            <div className={styles.corename}>
              <svg width="46" height="27" viewBox="0 0 34 20" fill="none" aria-hidden="true">
                <path d="M1 1 L8 10 L1 19 L6 19 L13 10 L6 1 Z" fill="#FF7A1A" />
                <path d="M11 1 L18 10 L11 19 L16 19 L23 10 L16 1 Z" fill="#1E7FE0" />
                <path d="M21 1 L28 10 L21 19 L26 19 L33 10 L26 1 Z" fill="#5B7AA6" />
              </svg>
              ShopRally
            </div>
            <div className={styles.coreline}>
              The whole toolbox. <span className={styles.corelineAccent}>One login.</span>
            </div>
          </div>
        </div>

        {showMicro ? (
          <p className={styles.micro}>
            <span className={styles.microStrong}>
              PartsTech ordering · CARFAX history · Twilio texting · NHTSA VIN
            </span>{" "}
            — wired into Ignition. Stripe Connect, Auto.dev, and more expand as the stack grows.
          </p>
        ) : null}
      </div>
    </section>
  );
}
