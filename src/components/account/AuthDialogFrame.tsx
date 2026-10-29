// Animate the account panel; closed controls become inert during their exit.
"use client";

import type { ReactNode, RefObject } from "react";
import { useIsPresent, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import styles from "./AuthModal.module.css";

interface AuthDialogFrameProps {
  children: ReactNode;
  dialogRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function AuthDialogFrame({ children, dialogRef, onClose }: AuthDialogFrameProps) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : .24, ease: [.22, 1, .36, 1] as const };

  return <m.div className={styles.backdrop} layoutRoot inert={!isPresent} aria-hidden={!isPresent || undefined}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .18 }}
    onMouseDown={event => { if (isPresent && event.target === event.currentTarget) onClose(); }}>
    <m.div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description"
      layout={!reduceMotion} layoutScroll style={{ borderRadius: 20 }} transition={transition}
      initial={{ y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : .99 }}>
      <m.div layout={reduceMotion ? false : "position"} transition={transition}>{children}</m.div>
    </m.div>
  </m.div>;
}
