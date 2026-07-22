"use client";

import { useEffect, useRef } from "react";

import styles from "./home.module.css";

export function ApprovalScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const deskJobs = [...scene.querySelectorAll<HTMLElement>(`.${styles.dfjob}`)];
    const phoneBtns = [...scene.querySelectorAll<HTMLButtonElement>(`.${styles.pjbtn}`)];
    const pout = scene.querySelector<HTMLElement>(`.${styles.pbOut}`);
    const chipmove = scene.querySelector<HTMLElement>(`.${styles.chipmove}`);
    const chiprec = scene.querySelector<HTMLElement>(`.${styles.chiprec}`);
    const dfstate = scene.querySelector<HTMLElement>(`.${styles.dfstate}`);
    const dfauth = scene.querySelector<HTMLElement>(`.${styles.dfauth}`);
    const dfappr = scene.querySelector<HTMLElement>("[data-dfappr]");
    const dfprog = scene.querySelector<HTMLElement>("[data-dfprog]");

    const timers: number[] = [];
    let intervalId: number | null = null;
    const schedule = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };

    let approved = 0;

    function sceneReset() {
      approved = 0;
      deskJobs.forEach((j) => {
        j.classList.remove(styles.ok, styles.no);
        const s = j.querySelector(`.${styles.djs}`);
        if (s) s.textContent = "Pending";
      });
      phoneBtns.forEach((b) => {
        b.classList.remove(styles.ok, styles.no);
        b.textContent = "Approve";
      });
      pout?.classList.add(styles.isHidden);
      chipmove?.classList.add(styles.isHidden);
      chiprec?.classList.add(styles.isHidden);
      if (dfstate) {
        dfstate.textContent = "Awaiting approval";
        dfstate.dataset.k = "wait";
      }
      if (dfauth) dfauth.textContent = "0/3 approved";
      if (dfappr) dfappr.textContent = "2";
      if (dfprog) dfprog.textContent = "2";
    }

    function tap(i: number, yes: boolean) {
      const b = phoneBtns[i];
      const j = deskJobs[i];
      if (!b || !j) return;
      b.classList.add(yes ? styles.ok : styles.no);
      b.textContent = yes ? "✓ Approved" : "Not now";
      j.classList.add(yes ? styles.ok : styles.no);
      const s = j.querySelector(`.${styles.djs}`);
      if (s) s.textContent = yes ? "Approved" : "Declined";
      if (yes) approved++;
      if (dfauth) dfauth.textContent = `${approved}/3 approved`;
    }

    function sceneLap() {
      sceneReset();
      schedule(() => tap(0, true), 1600);
      schedule(() => tap(1, true), 2800);
      schedule(() => tap(2, false), 4000);
      schedule(() => pout?.classList.remove(styles.isHidden), 5000);
      schedule(() => {
        if (dfstate) {
          dfstate.textContent = "In progress";
          dfstate.dataset.k = "prog";
        }
        if (dfappr) dfappr.textContent = "1";
        if (dfprog) dfprog.textContent = "3";
        chipmove?.classList.remove(styles.isHidden);
      }, 6200);
      schedule(() => chiprec?.classList.remove(styles.isHidden), 7600);
    }

    if (reduced) {
      tap(0, true);
      tap(1, true);
      tap(2, false);
      pout?.classList.remove(styles.isHidden);
      if (dfstate) {
        dfstate.textContent = "In progress";
        dfstate.dataset.k = "prog";
      }
      if (dfappr) dfappr.textContent = "1";
      if (dfprog) dfprog.textContent = "3";
      chipmove?.classList.remove(styles.isHidden);
      chiprec?.classList.remove(styles.isHidden);
    } else {
      sceneLap();
      intervalId = window.setInterval(sceneLap, 13400);
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className={`${styles.sec} ${styles.boardsec}`} id="board">
      <div className={`${styles.inner} ${styles.centerHead}`}>
        <div className={styles.rv}>
          <div className={styles.seceye}>See it work</div>
          <h2 className={styles.sechead}>Watch an approval happen.</h2>
          <p className={styles.secsub}>
            The estimate lands by text. She taps yes from the parking lot — and the board moves
            itself in the bay. The declined job goes to recovery, not to a sticky note.
          </p>
        </div>
        <div className={`${styles.scene} ${styles.rv}`} ref={sceneRef}>
          <div className={styles.scglow} aria-hidden="true" />

          <div className={styles.deskfrag} aria-label="A repair order card on the shop board">
            <div className={styles.dfrail}>
              <span className={styles.dfseg} style={{ ["--sc" as string]: "#B45309" }}>
                <i />
                Approval <b data-dfappr>2</b>
              </span>
              <span className={styles.dfseg} style={{ ["--sc" as string]: "#FF7A1A" }}>
                <i />
                In progress <b data-dfprog>2</b>
              </span>
              <span className={styles.dfseg} style={{ ["--sc" as string]: "#0E8A5F" }}>
                <i />
                Paid today <b>$1,318.40</b>
              </span>
            </div>
            <div className={styles.dfcard}>
              <div className={styles.dfr1}>
                <span className={styles.dfro}>RO-1047</span>
                <span className={styles.dfeyes}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1E7FE0" strokeWidth="3">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1E7FE0" strokeWidth="2.6">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <span className={styles.dfstate} data-k="wait">
                  Awaiting approval
                </span>
              </div>
              <div className={styles.dfname}>
                Danielle R. <span>· 2018 Honda CR-V</span>
              </div>
              <div className={styles.dfjobs}>
                <div className={styles.dfjob} data-j="0">
                  <span className={styles.djdot} />
                  <span className={styles.djn}>Front brake pads &amp; rotors</span>
                  <span className={styles.djp}>$412.60</span>
                  <span className={styles.djs}>Pending</span>
                </div>
                <div className={styles.dfjob} data-j="1">
                  <span className={styles.djdot} />
                  <span className={styles.djn}>Serpentine belt</span>
                  <span className={styles.djp}>$281.60</span>
                  <span className={styles.djs}>Pending</span>
                </div>
                <div className={styles.dfjob} data-j="2">
                  <span className={styles.djdot} />
                  <span className={styles.djn}>Cabin air filter</span>
                  <span className={styles.djp}>$89.99</span>
                  <span className={styles.djs}>Pending</span>
                </div>
              </div>
              <div className={styles.dffoot}>
                <span className={styles.dfauth}>0/3 approved</span>
                <span className={styles.dftotal}>$694.20</span>
              </div>
            </div>
            <div className={`${styles.fchipT} ${styles.chipmove} ${styles.isHidden}`}>
              RO-1047 auto-moved → In progress
            </div>
            <div className={`${styles.fchipT} ${styles.orange} ${styles.chiprec} ${styles.isHidden}`}>
              Cabin filter → recovery queue
            </div>
          </div>

          <div className={styles.phonefrag} aria-label="The customer's text thread">
            <div className={styles.phone}>
              <div className={styles.pnotch} />
              <div className={styles.pthread}>
                <div className={`${styles.pb} ${styles.pbIn}`}>
                  ShopRally · Your CR-V estimate is ready — 3 jobs, $694.20. Approve each below.
                </div>
                <div className={styles.papprove}>
                  <div className={styles.pjob}>
                    <span className={styles.pjn}>Brake pads &amp; rotors</span>
                    <span className={styles.pjp}>$412.60</span>
                    <button className={styles.pjbtn} type="button">
                      Approve
                    </button>
                  </div>
                  <div className={styles.pjob}>
                    <span className={styles.pjn}>Serpentine belt</span>
                    <span className={styles.pjp}>$281.60</span>
                    <button className={styles.pjbtn} type="button">
                      Approve
                    </button>
                  </div>
                  <div className={styles.pjob}>
                    <span className={styles.pjn}>Cabin air filter</span>
                    <span className={styles.pjp}>$89.99</span>
                    <button className={styles.pjbtn} type="button">
                      Approve
                    </button>
                  </div>
                </div>
                <div className={`${styles.pb} ${styles.pbOut} ${styles.isHidden}`}>Approved 2 of 3 ✓</div>
              </div>
            </div>
            <div className={styles.phlabel}>Her phone · nothing to install</div>
          </div>
        </div>
        <div className={`${styles.annrow} ${styles.rv}`}>
          <span className={styles.ann}>
            <i />
            She approves from the parking lot
          </span>
          <span className={styles.ann}>
            <i />
            The card moves itself
          </span>
          <span className={styles.ann}>
            <i />
            Declined work is never lost
          </span>
        </div>
      </div>
    </section>
  );
}
