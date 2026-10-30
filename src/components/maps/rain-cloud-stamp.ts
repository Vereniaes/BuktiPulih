// Todo:
// -> Cache two small cloud textures for static rain areas.
// -> Distinguish current rain from recent rain without animation.

// --- Cached cloud texture ---
import { rainPuffs } from "./rain-areas";
const stamps = new Map<boolean, HTMLCanvasElement>();

/** Purpose: Reuse a soft cloud texture. Input: current or recent rain. Output: one cached canvas, with no running animation. */
export function rainCloudStamp(now: boolean): HTMLCanvasElement {
  const cached = stamps.get(now); if (cached) return cached;
  const stamp = document.createElement("canvas"); stamp.width = 192; stamp.height = 192;
  const context = stamp.getContext("2d"); if (!context) return stamp;
  context.translate(96, 96); context.scale(80, 80);
  for (const [x, y, rx, ry] of rainPuffs) {
    context.save(); context.translate(x + .025, y - .045); context.scale(rx * 1.04, ry * 1.04);
    const shadow = context.createRadialGradient(0, 0, .1, 0, 0, 1);
    shadow.addColorStop(0, "rgba(38,77,96,.35)"); shadow.addColorStop(.72, "rgba(48,90,110,.26)"); shadow.addColorStop(1, "rgba(48,90,110,0)");
    context.fillStyle = shadow; context.beginPath(); context.arc(0, 0, 1, 0, Math.PI * 2); context.fill(); context.restore();
  }
  for (const [x, y, rx, ry] of rainPuffs) {
    context.save(); context.translate(x, y + .04); context.scale(rx * .94, ry * .9);
    const core = context.createRadialGradient(-.12, .14, .05, 0, 0, 1);
    core.addColorStop(0, now ? "rgba(242,248,250,.94)" : "rgba(239,244,237,.78)");
    core.addColorStop(.56, now ? "rgba(222,235,241,.88)" : "rgba(220,229,219,.7)");
    core.addColorStop(.8, now ? "rgba(151,180,195,.65)" : "rgba(157,179,168,.46)");
    core.addColorStop(1, "rgba(144,173,187,0)");
    context.fillStyle = core; context.beginPath(); context.arc(0, 0, 1, 0, Math.PI * 2); context.fill(); context.restore();
  }
  if (now) {
    context.strokeStyle = "rgba(44,101,134,.9)"; context.lineWidth = .025; context.lineCap = "round";
    for (const x of [-.3, 0, .3]) { context.beginPath(); context.moveTo(x, -.42); context.lineTo(x - .06, -.62); context.stroke(); }
  }
  stamps.set(now, stamp); return stamp;
}
// --- end of Cached cloud texture ---
