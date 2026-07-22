"use client";

import { useEffect, useRef } from "react";

import styles from "./home.module.css";

export function RecoveryLoop() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rqrows = [...root.querySelectorAll<HTMLElement>(`.${styles.rqrow}`)];
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    function rqReset(row: HTMLElement) {
      row.classList.remove(styles.booked);
      const b = row.querySelector<HTMLButtonElement>(`.${styles.rqbtn}`);
      if (!b) return;
      b.classList.remove(styles.sent);
      b.textContent = "Resend";
    }

    function rqCycle(i: number) {
      const row = rqrows[i % rqrows.length];
      if (!row) return;
      const b = row.querySelector<HTMLButtonElement>(`.${styles.rqbtn}`);
      if (!b) return;
      b.classList.add(styles.sent);
      b.textContent = "Sent ✓";
      schedule(() => {
        row.classList.add(styles.booked);
        b.textContent = "Booked";
      }, 1300);
      schedule(() => rqReset(row), 3400);
    }

    if (!rqrows.length) return;

    if (reduced) {
      const r0 = rqrows[0]!;
      r0.classList.add(styles.booked);
      const b0 = r0.querySelector<HTMLButtonElement>(`.${styles.rqbtn}`);
      if (b0) {
        b0.classList.add(styles.sent);
        b0.textContent = "Booked";
      }
    } else {
      let ri = 0;
      let cancelled = false;
      const tickQ = () => {
        if (cancelled) return;
        rqCycle(ri++);
        schedule(tickQ, 4300);
      };
      schedule(tickQ, 1400);
      return () => {
        cancelled = true;
        timers.forEach((id) => window.clearTimeout(id));
      };
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <section className={`${styles.sec}`} id="recovery">
      <div className={`${styles.inner} ${styles.grid2}`} ref={rootRef}>
        <div className={styles.rv}>
          <div className={styles.seceye}>The ShopRally difference</div>
          <h2 className={styles.sechead}>Declined work comes back.</h2>
          <p className={styles.secsub}>
            Every shop loses thousands a month to &quot;let me think about it.&quot; Other systems
            file it in a list. ShopRally runs a loop.
          </p>
          <div className={styles.steps}>
            <div className={styles.steprow}>
              <span className={styles.sdot} />
              <div className={styles.st}>
                <b>Declined — saved, not lost.</b>
                <p>The job stays attached to the customer and the car, with the reason and the date.</p>
              </div>
            </div>
            <div className={styles.steprow}>
              <span className={styles.sdot} />
              <div className={styles.st}>
                <b>Repriced — automatically.</b>
                <p>
                  When parts pricing moves, the quote updates itself. No spreadsheet, no memory
                  required.
                </p>
              </div>
            </div>
            <div className={styles.steprow}>
              <span className={styles.sdot} />
              <div className={styles.st}>
                <b>Resent — one tap, booked.</b>
                <p>A fresh estimate lands by text at the right moment. Approval books the visit.</p>
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles.recviz} ${styles.rv}`}>
          <div className={styles.rqcard} aria-label="The recovery queue">
            <div className={styles.rqhead}>
              <span className={styles.rqic}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </span>
              Recovery queue <span className={styles.rqn}>3</span>
            </div>
            <div className={styles.rqrow} data-r="0">
              <span className={styles.rqjob}>
                Timing cover reseal
                <span>Declined May · repriced −$37.50</span>
              </span>
              <span className={styles.rqamt}>+$742.50</span>
              <button className={styles.rqbtn} type="button">
                Resend
              </button>
            </div>
            <div className={styles.rqrow} data-r="1">
              <span className={styles.rqjob}>
                Motor mounts (pair)
                <span>Declined May · repriced −$11.45</span>
              </span>
              <span className={styles.rqamt}>+$398.80</span>
              <button className={styles.rqbtn} type="button">
                Resend
              </button>
            </div>
            <div className={styles.rqrow} data-r="2">
              <span className={styles.rqjob}>
                CVT fluid service
                <span>Due at 90k · reminder queued</span>
              </span>
              <span className={styles.rqamt}>+$289.99</span>
              <button className={styles.rqbtn} type="button">
                Resend
              </button>
            </div>
            <div className={styles.rqfoot}>Illustrative — your queue fills itself.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
