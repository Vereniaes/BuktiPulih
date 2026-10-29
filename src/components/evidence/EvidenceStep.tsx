// Fade between form steps and keep departing fields out of keyboard navigation.
"use client";
import type { ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import styles from "./evidence-form.module.css";
interface Props { step: number; locked: boolean; onReady: () => void; children: ReactNode; }
export function EvidenceStep({ step, locked, onReady, children }: Props) {
  const present = useIsPresent(), reduced = useReducedMotion();
  return <motion.section className={styles.stepPanel} data-evidence-step={step} inert={!present || locked} aria-hidden={!present || undefined}
    initial="enter" animate="visible" exit="exit" variants={{
      enter: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 },
      visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : .16, ease: [.22, 1, .36, 1] } },
      exit: { opacity: reduced ? 1 : 0, transition: { duration: reduced ? 0 : .12, ease: "easeIn" } },
    }} onAnimationComplete={variant => { if (present && variant === "visible") onReady(); }}>
    {children}
  </motion.section>;
}
