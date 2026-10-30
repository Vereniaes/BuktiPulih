// Todo:
// -> project and group map entities
// -> paint markers without thousands of DOM nodes

import type { ExplorerMapApi, ExplorerPoint } from "@/types/explorer-map";
import { snapshotProjection } from "./map-projection";

// --- Marker data ---
export interface ExplorerMarker {
  id: string;
  point: ExplorerPoint;
  kind: "dot" | "pin" | "report" | "air" | "wind";
  label: string;
  color?: string;
  value?: string;
  rotation?: number;
  opacity?: number;
  selected?: boolean;
  cluster?: string;
}
export interface ScreenMarker { marker: ExplorerMarker; x: number; y: number; members?: ExplorerMarker[] }

/** Project visible markers and group only compatible sources. Input: map and entities. Output: screen hit targets. */
export function projectMarkers(api: ExplorerMapApi, markers: ExplorerMarker[], cluster: boolean, expanded: string | null): ScreenMarker[] {
  const size = api.getSize(), groups = new Map<string, ScreenMarker[]>(), result: ScreenMarker[] = [];
  const [west,south,east,north]=api.getBounds();
  const project = snapshotProjection(api);
  for (const marker of markers) {
    const [lng,lat]=marker.point;
    if(lat<south||lat>north||(west<=east?(lng<west||lng>east):(lng<west&&lng>east)))continue;
    const pixel = project(marker.point);
    if (!Number.isFinite(pixel.x + pixel.y) || pixel.x < -44 || pixel.x > size.width + 44 || pixel.y < -44 || pixel.y > size.height + 44) continue;
    const item = { marker, ...pixel };
    if (!cluster || !marker.cluster || marker.selected) { result.push(item); continue; }
    const key = `${marker.cluster}:${Math.floor(pixel.x / 55)}:${Math.floor(pixel.y / 55)}`;
    const group = groups.get(key) ?? []; group.push(item); groups.set(key, group);
  }
  for (const [id, group] of groups) {
    if (group.length === 1) { result.push(group[0]); continue; }
    const x = group.reduce((sum, item) => sum + item.x, 0) / group.length;
    const y = group.reduce((sum, item) => sum + item.y, 0) / group.length;
    if (expanded === id) {
      group.forEach((item, index) => {
        const angle = index * 2.399963, radius = 26 + 17 * Math.sqrt(index);
        result.push({ ...item, x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
      });
    } else result.push({ marker: { ...group[0].marker, id, point: api.unproject({ x, y }), value: String(group.length), label: `${group.length} ${group[0].marker.cluster}` }, x, y, members: group.map(item => item.marker) });
  }
  return result.sort((a, b) => Number(Boolean(a.marker.selected)) - Number(Boolean(b.marker.selected)));
}
// --- end of Marker data ---

// --- Canvas drawing ---
/** Paint a marker at its projected position. Input: canvas context, hit target and map heading. Output: pixels. */
export function paintMarker(context: CanvasRenderingContext2D, item: ScreenMarker, bearing: number, focused: boolean) {
  const { marker, x, y } = item, color = marker.color ?? "#2d5a43";
  context.save(); context.translate(x, y); context.globalAlpha = marker.opacity ?? 1;
  context.lineWidth = marker.selected || focused ? 3 : 2; context.strokeStyle = "#fffdf6"; context.fillStyle = color;
  if (marker.selected || focused) {
    context.beginPath(); context.arc(0, marker.kind === "pin" || marker.kind === "report" ? -13 : 0, 22, 0, Math.PI * 2);
    context.strokeStyle = "#102b27"; context.stroke(); context.strokeStyle = "#fffdf6";
  }
  if (item.members || marker.kind === "air") {
    context.beginPath(); context.arc(0, 0, 17, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = marker.kind === "air" && color === "#ecd437" ? "#17221b" : "#ffffff";
    context.font = "700 12px 'Plus Jakarta Sans',sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(marker.value ?? "", 0, 0);
  } else if (marker.kind === "pin" || marker.kind === "report") {
    if (marker.kind === "report") context.setLineDash([3, 2]);
    context.beginPath(); context.moveTo(0, 2); context.bezierCurveTo(-5, -6, -14, -13, -14, -21); context.arc(0, -21, 14, Math.PI, 0); context.bezierCurveTo(14, -13, 5, -6, 0, 2); context.fill(); context.stroke();
    context.setLineDash([]); context.fillStyle = "#ffffff";
    if (marker.kind === "report") { context.fillRect(-5, -27, 10, 12); context.fillStyle = color; context.fillRect(-2, -24, 4, 2); context.fillRect(-2, -20, 4, 2); }
    else { context.beginPath(); context.arc(0, -21, 4, 0, Math.PI * 2); context.fill(); }
  } else if (marker.kind === "wind") {
    context.rotate(((marker.rotation ?? 0) - bearing) * Math.PI / 180); context.strokeStyle = color; context.lineWidth = 2.5;
    context.beginPath(); context.moveTo(0, 15); context.lineTo(0, -15); context.moveTo(-5, -8); context.lineTo(0, -15); context.lineTo(5, -8); context.stroke();
  } else {
    context.beginPath(); context.arc(0, 0, 4, 0, Math.PI * 2); context.fill(); context.lineWidth = 1; context.strokeStyle = "#512616"; context.stroke();
  }
  context.restore();
}
// --- end of Canvas drawing ---
