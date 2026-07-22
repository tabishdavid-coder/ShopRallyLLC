import styles from "./home.module.css";

export function Arsenal() {
  return (
    <section className={styles.sec} id="features">
      <div className={styles.inner}>
        <div className={`${styles.rv} ${styles.centerHead}`}>
          <div className={styles.seceye}>The whole toolbox</div>
          <h2 className={styles.sechead}>Everything we&apos;re building in.</h2>
          <p className={styles.secsub}>
            Not a starter tier. Not a maze of add-ons. The full stack, from the first day.
          </p>
        </div>
        <div className={`${styles.featgrid} ${styles.rv}`}>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvcol} style={{ ["--c" as string]: "#B45309" }}>
                <i />
                <i />
              </span>
              <span className={styles.mvcol} style={{ ["--c" as string]: "#FF7A1A" }}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.mvcol} style={{ ["--c" as string]: "#0E8A5F" }}>
                <i />
              </span>
            </div>
            <b>Job board &amp; digital ROs</b>
            <p>Every car, every stage, one living board.</p>
          </div>
          <div className={styles.fcard}>
            <div className={`${styles.fviz} ${styles.fvcol}`}>
              <span className={styles.mvrow}>
                <span className={styles.mvbar} style={{ width: "52%" }} />
                <span className={styles.mvprice}>$412.60</span>
              </span>
              <span className={styles.mvrow}>
                <span className={styles.mvbar} style={{ width: "38%" }} />
                <span className={styles.mvprice}>$281.60</span>
              </span>
              <span className={styles.mvtag}>PartsTech · live</span>
            </div>
            <b>Estimates + PartsTech</b>
            <p>Parts priced live, punched out in seconds.</p>
          </div>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvphoto} />
              <span className={`${styles.mvphoto} ${styles.mvphotoWarn}`} />
              <span className={styles.mvphoto} />
            </div>
            <b>Digital inspections</b>
            <p>Photo DVIs customers actually open.</p>
          </div>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvshield}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z" />
                </svg>
              </span>
              <span className={styles.mvtext}>
                <b>9 service records</b>
                No accidents reported
              </span>
            </div>
            <b>CARFAX vehicle history</b>
            <p>The full story behind every VIN.</p>
          </div>
          <div className={styles.fcard}>
            <div className={`${styles.fviz} ${styles.fvcol} ${styles.stretchBubbles}`}>
              <span className={`${styles.mvbub} ${styles.mvbubIn}`}>Ready by 4 — ok?</span>
              <span className={`${styles.mvbub} ${styles.mvbubOut}`}>Perfect, thanks!</span>
            </div>
            <b>Two-way texting</b>
            <p>Updates and answers where customers live.</p>
          </div>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvapprove}>✓ Approved</span>
              <span className={styles.mvprice} style={{ fontSize: 11 }}>
                $694.20
              </span>
            </div>
            <b>Text-to-approve</b>
            <p>Each job, one tap. Approval moves the card.</p>
          </div>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvday}>M</span>
              <span className={`${styles.mvday} ${styles.mvdayOn}`}>T</span>
              <span className={styles.mvday}>W</span>
              <span className={styles.mvday}>T</span>
              <span className={styles.mvday}>F</span>
            </div>
            <b>Appointments</b>
            <p>A week you can see, slots that fill themselves.</p>
          </div>
          <div className={styles.fcard}>
            <div className={styles.fviz}>
              <span className={styles.mvavs}>
                <i style={{ background: "#155FA8" }}>MG</i>
                <i style={{ background: "#0E8A5F" }}>TJ</i>
                <i style={{ background: "#B45309" }}>RM</i>
              </span>
              <span className={styles.mvtag}>+ unlimited</span>
            </div>
            <b>Unlimited users &amp; ROs</b>
            <p>No per-seat math. Ever.</p>
          </div>
        </div>
        <div className={`${styles.featanchor} ${styles.rv}`}>
          Platforms that ship this list start at <b>$199/mo</b>. Hold that thought.
        </div>
      </div>
    </section>
  );
}
