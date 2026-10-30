// Todo:
// -> Share pending and press feedback for homepage actions.

// --- Homepage actions ---
"use client";

import { useTransition, type ReactNode } from "react";
import { useReducedMotion, type HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";
import { useLinkStatus } from "next/link";
import styles from "./home.module.css";

type Props = Omit<HTMLMotionProps<"button">, "children"> & { children?: ReactNode; language?: "id" | "en" };

export function HomeActionButton({ children, onClick, className, language = "id", disabled, ...props }: Props) {
  const [pending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();
  return (
    <m.button
      type="button"
      {...props}
      className={`${styles.actionButton} ${className || ""}`}
      tabIndex={props.tabIndex ?? 0}
      disabled={disabled}
      aria-disabled={disabled || pending || undefined}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
      whileHover={reducedMotion || disabled || pending ? undefined : { y: -2, transition: { duration: 0.18 } }}
      whileTap={reducedMotion || disabled || pending ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}
      onClick={event => { if (!pending) startTransition(() => onClick?.(event)); }}
    >
      <span className={styles.actionContent}>{children}</span>
      {pending && <span className={styles.actionPending} role="status"><span className={styles.spinner} aria-hidden="true" />{language === "en" ? "Opening…" : "Membuka…"}</span>}
    </m.button>
  );
}

export function HomeStoryLabel({ language = "id", label }: { language?: "id" | "en"; label?: string }) {
  const { pending } = useLinkStatus();
  return <span className={styles.storyLabel} aria-live="polite" aria-busy={pending || undefined}>
    {pending && <span className={styles.spinner} aria-hidden="true" />}
    {pending ? (language === "en" ? "Opening…" : "Membuka…") : (label || (language === "en" ? "Read story →" : "Lihat cerita →"))}
  </span>;
}
// --- end of Homepage actions ---
