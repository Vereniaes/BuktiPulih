// Todo:
// -> Capture a flat Google projection once for large canvas batches.
// -> Keep terrain and unusual camera views on the native projection.

// --- Projection snapshot ---
import type { ExplorerMapApi, ExplorerPoint } from "@/types/explorer-map";
const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360));

/** Purpose: Avoid thousands of native projection calls during a flat map redraw.
 * Input: Active map. Output: Geographic point to current container pixel.
 */
export function snapshotProjection(api: ExplorerMapApi) {
  const native = (point: ExplorerPoint) => api.project(point);
  if (api.engine !== "google") return native;
  const view = api.getView();
  if (view.pitch || view.bearing || Math.abs(view.center[1]) > 80) return native;
  const [longitude, latitude] = view.center, origin = native(view.center);
  const east = native([longitude + 1, latitude]), north = native([longitude, latitude + 1]);
  const base = mercator(latitude), scaleX = east.x - origin.x, scaleY = (north.y - origin.y) / (mercator(latitude + 1) - base);
  if (!Number.isFinite(origin.x + origin.y + scaleX + scaleY) || scaleX <= 0 || scaleY >= 0) return native;
  return ([lng, lat]: ExplorerPoint) => ({
    x: origin.x + ((lng - longitude + 540) % 360 - 180) * scaleX,
    y: origin.y + (mercator(lat) - base) * scaleY,
  });
}
// --- end of Projection snapshot ---
