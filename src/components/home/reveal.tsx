import Link from "next/link";

import styles from "./home.module.css";

export function Reveal() {
  return (
    <section className={`${styles.sec} ${styles.pricingPad}`} id="pricing">
      <div className={styles.inner}>
        <div className={styles.rv}>
          <div className={styles.seceye}>The price</div>
          <h2 className={styles.sechead}>Add it up first.</h2>
          <p className={styles.secsub}>
            You&apos;ve seen the whole toolbox. Price it the way the market does — then read the
            bottom line.
          </p>
        </div>
        <div className={`${styles.revealgrid} ${styles.rv}`}>
          <div className={styles.receipt} aria-label="Ignition itemized like a shop estimate">
            <div className={styles.rchead}>
              <span>ShopRally · Ignition</span>
              <span>Estimate</span>
            </div>
            <div className={styles.rcline}>
              <span>Job board &amp; digital ROs</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Estimates + PartsTech punchout</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Digital inspections (DVI)</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>CARFAX vehicle history</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Two-way texting + text-to-approve</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Appointments &amp; scheduling</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Payment tracking</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcline}>
              <span>Unlimited users &amp; ROs</span>
              <span className={styles.ck}>✓</span>
            </div>
            <div className={styles.rcsub}>
              <span>Priced the way premium platforms price it</span>
              <span className={styles.strike}>$199–$300/mo</span>
            </div>
            <div className={styles.rctotal}>
              <span>Ignition — one plan</span>
              <span className={styles.amt}>$99.99/mo</span>
            </div>
            <div className={styles.rcfoot}>Everything above. Founding price locks at launch.</div>
          </div>
          <div className={styles.reveal}>
            <div className={styles.seceye}>Our bottom line</div>
            <div className={styles.bigprice}>
              $99.99<span>/mo</span>
            </div>
            <p className={styles.secsub} style={{ marginTop: 14 }}>
              Everything on the slip. One plan — no tiers, no per-seat math, no add-on maze. Less
              than half of where the premium platforms start.
            </p>
            <div className={`${styles.aiplus} ${styles.aiplusGap}`}>
              <div className={styles.apk}>Optional add-on</div>
              <div className={styles.app}>
                AI Plus · $49.99<span>/mo</span>
              </div>
              <ul>
                <li>Freeform AI intake</li>
                <li>Labor-time assist</li>
                <li>Advisor mobile app</li>
              </ul>
              <div className={styles.bundle}>
                Ignition + AI Plus — <b>$149.98/mo</b>, still under one premium seat elsewhere.
              </div>
            </div>
            <div className={styles.pricectas}>
              <Link className={styles.cta} href="#reserve">
                Reserve a founding seat
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
