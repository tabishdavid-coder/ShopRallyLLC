import styles from "./home.module.css";

export function Founder() {
  return (
    <section className={`${styles.sec} ${styles.foundsec}`} id="founder">
      <div className={styles.inner}>
        <div className={styles.rv}>
          <div className={styles.seceye}>Who&apos;s behind it</div>
          <h2 className={styles.sechead}>Built inside a working shop.</h2>
        </div>
        <div className={`${styles.fband} ${styles.rv}`}>
          <div>
            <p className={styles.fquote}>
              &quot;I didn&apos;t set out to sell software. I run a shop, and nothing out there earned
              what it charged — so we built the system my own shop actually needed.{" "}
              <b>Every screen in ShopRally has fixed a real Tuesday.</b>&quot;
            </p>
            <div className={styles.fby}>
              <b>Roger</b> — Shop owner · Founder, ShopRally
            </div>
            <div className={styles.fchips}>
              <span className={styles.fchip}>Owner-operated shop</span>
              <span className={styles.fchip}>Built on real repair orders</span>
              <span className={styles.fchip}>Still turning wrenches</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
