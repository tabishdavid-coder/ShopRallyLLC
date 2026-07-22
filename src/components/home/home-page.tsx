"use client";

import { useRef } from "react";

import { ApprovalScene } from "./approval-scene";
import { Arsenal } from "./arsenal";
import { CompareTable } from "./compare-table";
import { Founder } from "./founder";
import { Hero } from "./hero";
import styles from "./home.module.css";
import { RecoveryLoop } from "./recovery-loop";
import { Reserve } from "./reserve";
import { Reveal } from "./reveal";
import { useHomeReveals } from "./use-home-reveals";

/** New homepage composition — dark hero → light zone → dark door. */
export function HomePageContent() {
  const pageRef = useRef<HTMLDivElement>(null);
  useHomeReveals(pageRef);

  return (
    <div className={styles.page} ref={pageRef}>
      <Hero />
      <div className={styles.lightzone}>
        <ApprovalScene />
        <Arsenal />
        <RecoveryLoop />
        <Founder />
        <Reveal />
        <CompareTable />
      </div>
      <Reserve />
    </div>
  );
}
