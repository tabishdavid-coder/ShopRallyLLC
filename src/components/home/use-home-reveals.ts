"use client";

import { useEffect, type RefObject } from "react";

import styles from "./home.module.css";

/** IntersectionObserver scroll reveals — guarded for missing IO + reduced motion. */
export function useHomeReveals(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rvs = [...root.querySelectorAll<HTMLElement>(`.${styles.rv}`)];

    if ("IntersectionObserver" in window && !reduced) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add(styles.rvIn);
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 },
      );
      rvs.forEach((el) => io.observe(el));
      return () => io.disconnect();
    }

    rvs.forEach((el) => el.classList.add(styles.rvIn));
  }, [rootRef]);
}
