"use client";

import { useRef, useState, useTransition } from "react";

import { submitFoundingWaitlist } from "@/server/actions/marketing-leads";

import styles from "./home.module.css";

export function Reserve() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();
  const submittingRef = useRef(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || pending) return;
    if (!email.includes("@")) return;
    submittingRef.current = true;
    setError(null);
    start(async () => {
      try {
        const res = await submitFoundingWaitlist({
          email,
          source: "homepage-inline",
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setSubmitted(true);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <section className={`${styles.sec} ${styles.ressec}`} id="reserve">
      <div className={`${styles.inner} ${styles.rv} ${styles.doorHead}`}>
        <div className={styles.seceye}>Q4 2026</div>
        <h2 className={styles.sechead}>Ready when you are.</h2>
        <p className={styles.secsub}>
          Reserve a founding seat and we&apos;ll invite you at launch — migration included, price
          locked.
        </p>
        <form
          className={`${styles.resform} ${submitted ? styles.resformHide : ""}`}
          onSubmit={onSubmit}
        >
          <input
            className={styles.resin}
            type="email"
            required
            autoComplete="email"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
          <button className={styles.cta} type="submit" disabled={pending}>
            {pending ? "Reserving…" : "Reserve my seat"}
          </button>
        </form>
        {error ? <div className={styles.resErr}>{error}</div> : null}
        <div className={`${styles.resok} ${submitted ? styles.resokShow : ""}`}>
          You&apos;re on the list — we&apos;ll invite you at launch. No card, no commitment.
        </div>
        <div className={styles.micro} style={{ marginTop: 14 }}>
          Free to reserve · no card · founding price locks at launch
        </div>
      </div>
    </section>
  );
}
