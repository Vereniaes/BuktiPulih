// Give every page the same arrival animation without changing its layout.
import type { ComponentPropsWithoutRef } from "react";

type PageMotionProps = Pick<ComponentPropsWithoutRef<"main">, "children" | "className" | "style" | "tabIndex">;

export function PageMotion({ children, className = "", ...props }: PageMotionProps) {
  return <main {...props} className={`portal-page-motion ${className}`}>{children}</main>;
}
