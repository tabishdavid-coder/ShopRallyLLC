import styles from "./home.module.css";

export function CompareTable() {
  return (
    <section className={styles.sec} id="compare">
      <div className={styles.inner}>
        <div className={styles.rv}>
          <div className={styles.seceye}>The honest map</div>
          <h2 className={styles.sechead}>Where ShopRally sits.</h2>
          <p className={styles.secsub}>
            Base plan against base plan — what $99.99 buys here versus what $199 starts you with
            over there.
          </p>
        </div>
        <div className={`${styles.tblwrap} ${styles.rv}`}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th />
                <th className={styles.us}>
                  <span className={styles.uschev}>
                    <svg width="20" height="12" viewBox="0 0 34 20" fill="none">
                      <path d="M1 1 L8 10 L1 19 L6 19 L13 10 L6 1 Z" fill="#FF7A1A" />
                      <path d="M11 1 L18 10 L11 19 L16 19 L23 10 L16 1 Z" fill="#1E7FE0" />
                      <path d="M21 1 L28 10 L21 19 L26 19 L33 10 L26 1 Z" fill="#5B7AA6" />
                    </svg>
                  </span>
                  ShopRally
                </th>
                <th>Tekmetric</th>
                <th>Shopmonkey</th>
                <th>AutoLeap</th>
                <th>Torque360</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base plan, per month</td>
                <td className={styles.us}>
                  <b>$99.99</b>
                  <span className={styles.tsub}>everything below included</span>
                </td>
                <td>
                  $199+
                  <span className={styles.tsub}>3 tiers</span>
                </td>
                <td>
                  $199+
                  <span className={styles.tsub}>3 tiers</span>
                </td>
                <td>
                  $199–$449
                  <span className={styles.tsub}>4 tiers</span>
                </td>
                <td>
                  $69.99+
                  <span className={styles.tsub}>3 tiers</span>
                </td>
              </tr>
              <tr>
                <td>Two-way texting at the base price</td>
                <td className={styles.us}>
                  <span className={styles.ck}>✓</span> Included
                </td>
                <td>Varies by tier*</td>
                <td>Varies by tier*</td>
                <td>
                  <span className={styles.nk}>✗</span>
                  <span className={styles.tsub}>Pro tier — $349/mo</span>
                </td>
                <td>
                  <span className={styles.ck}>✓</span>
                </td>
              </tr>
              <tr>
                <td>Unlimited users at the base price</td>
                <td className={styles.us}>
                  <span className={styles.ck}>✓</span> Included
                </td>
                <td>Varies by tier*</td>
                <td>Varies by tier*</td>
                <td>
                  <span className={styles.nk}>✗</span>
                  <span className={styles.tsub}>3 users at base · unlimited = Elite $449</span>
                </td>
                <td>Varies by tier*</td>
              </tr>
              <tr>
                <td>Run by someone who runs a shop</td>
                <td className={styles.us}>
                  <span className={styles.ck}>✓</span> Today
                </td>
                <td>Founder ex-owner</td>
                <td>
                  <span className={styles.nk}>—</span>
                </td>
                <td>
                  <span className={styles.nk}>—</span>
                </td>
                <td>
                  <span className={styles.nk}>—</span>
                </td>
              </tr>
              <tr>
                <td>Automated declined-work recovery</td>
                <td className={styles.us}>
                  <span className={styles.ck}>✓</span> Built-in loop
                </td>
                <td>
                  <span className={styles.nk}>—*</span>
                </td>
                <td>
                  <span className={styles.nk}>—*</span>
                </td>
                <td>
                  <span className={styles.nk}>—*</span>
                </td>
                <td>
                  <span className={styles.nk}>—*</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className={`${styles.tblnote} ${styles.rv}`}>
          * Base-tier inclusion not stated on public pricing/feature pages as of July 2026. AutoLeap
          tier details from autoleap.com/pricing, July 2026.
        </div>
      </div>
    </section>
  );
}
