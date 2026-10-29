// Keep keyboard focus inside the active dialog, including nested dialogs.
import type { KeyboardEvent } from "react";
export function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab" || (event.target as HTMLElement).closest("dialog") !== event.currentTarget) return;
  const targets = [...event.currentTarget.querySelectorAll<HTMLElement>("button,input,select,textarea,summary,a[href],iframe,[tabindex]")]
    .filter(node => node.tabIndex >= 0 && !node.matches(":disabled") && !node.closest("[inert]") && node.getClientRects().length);
  if (!targets.length) return;
  const first = targets[0], last = targets[targets.length - 1];
  if (event.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
