// Todo:
// -> Load available satellite tiles within a small request budget.
// -> Crop real parent imagery when a detailed tile is unavailable.
// -> Share in-flight tiles and release cancelled requests.

// --- Tile requests ---
interface Tile { z: number; x: number; y: number; }
interface TileAvailability { location: { top: number; left: number; width: number; height: number }; data: number[]; error?: { code: number }; }
interface PendingTile { controller: AbortController; users: number; promise: Promise<Blob | null>; }
const service = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile";
const aborted = () => new DOMException("Map request cancelled", "AbortError");
let protocolId = 0;

/** Purpose: Load terrain imagery. Input: concurrent request limit. Output: tile loader and cleanup. */
export function createTerrainImagery(limit = 4) {
  const cache = new Map<string, { blob: Blob | null; time: number }>(), pending = new Map<string, PendingTile>();
  const waiting = new Set<() => void>(), lifecycle = new AbortController();
  const blocks = new Map<string, Promise<TileAvailability | null>>();
  let active = 0, disposed = false;
  const protocol = "bp-imagery-" + ++protocolId;

  async function slot(signal: AbortSignal) {
    if (disposed || signal.aborted) throw aborted();
    if (active < limit) { active++; return; }
    await new Promise<void>((resolve, reject) => {
      const cancel = () => { waiting.delete(next); reject(aborted()); };
      const next = () => { signal.removeEventListener("abort", cancel); if (disposed || signal.aborted) { reject(aborted()); return; } active++; resolve(); };
      waiting.add(next); signal.addEventListener("abort", cancel, { once: true });
    });
  }
  function release() { active--; const next = waiting.values().next().value; if (next) { waiting.delete(next); next(); } }

  async function available(tile: Tile, signal: AbortSignal) {
    if (tile.z < 16) return true;
    const top = Math.floor(tile.y / 32) * 32, left = Math.floor(tile.x / 32) * 32, key = `${tile.z}/${top}/${left}`;
    let block = blocks.get(key);
    if (!block) {
      block = (async () => {
        await slot(lifecycle.signal);
        try {
          const response = await fetch(`${service.replace(/\/tile$/, "")}/tilemap/${key}/32/32?f=json`,
            { signal: AbortSignal.any([lifecycle.signal, AbortSignal.timeout(5000)]) });
          if (!response.ok) return null;
          const data = await response.json() as TileAvailability;
          if (data.error?.code === 422) return { location: { top, left, width: 32, height: 32 }, data: Array(1024).fill(0) };
          return data.location && Array.isArray(data.data) ? data : null;
        } catch { if (lifecycle.signal.aborted) throw aborted(); return null; }
        finally { release(); }
      })();
      blocks.set(key, block);
      while (blocks.size > 64) blocks.delete(blocks.keys().next().value!);
    }
    const data = await block;
    if (signal.aborted) throw aborted();
    if (!data) { blocks.delete(key); return true; }
    const row = tile.y - data.location.top, column = tile.x - data.location.left;
    if (row < 0 || column < 0 || row >= data.location.height || column >= data.location.width) return true;
    return data.data[row * data.location.width + column] !== 0;
  }

  async function fetchTile(tile: Tile, signal: AbortSignal): Promise<Blob | null> {
    if (!await available(tile, signal)) return null;
    await slot(signal);
    const timeout = AbortSignal.timeout(7000), combined = AbortSignal.any([signal, timeout]);
    try {
      // Esri returns a labelled grey image by default for missing cache tiles.
      const response = await fetch(`${service}/${tile.z}/${tile.y}/${tile.x}?blankTile=false`, { signal: combined });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return null;
      return await response.blob();
    } catch (error) {
      if (signal.aborted) throw aborted();
      // Missing tiles may return 404 without CORS headers, which fetch exposes as TypeError.
      if (error instanceof TypeError || timeout.aborted) return null;
      throw error;
    } finally { release(); }
  }

  function remember(key: string, blob: Blob | null) {
    cache.delete(key); cache.set(key, { blob, time: Date.now() });
    while (cache.size > 96) cache.delete(cache.keys().next().value!);
  }

  async function source(tile: Tile, signal: AbortSignal): Promise<Blob | null> {
    if (disposed || signal.aborted) throw aborted();
    const key = `${tile.z}/${tile.x}/${tile.y}`;
    const saved = cache.get(key);
    if (saved && Date.now() - saved.time < (saved.blob ? 600000 : 15000)) { cache.delete(key); cache.set(key, saved); return saved.blob; }
    if (pending.get(key)?.controller.signal.aborted) pending.delete(key);
    let entry = pending.get(key);
    if (!entry) {
      const controller = new AbortController();
      const request: PendingTile = { controller, users: 0, promise: Promise.resolve(null) };
      request.promise = fetchTile(tile, controller.signal).then(blob => { if (!disposed) remember(key, blob); return blob; })
        .finally(() => { if (pending.get(key) === request) pending.delete(key); });
      entry = request; pending.set(key, entry);
    }
    entry.users++;
    const shared = entry;
    return new Promise<Blob | null>((resolve, reject) => {
      let settled = false;
      const finish = () => { if (settled) return false; settled = true; signal.removeEventListener("abort", cancel); shared.users--; if (!shared.users && pending.get(key) === shared) shared.controller.abort(); return true; };
      const cancel = () => { if (finish()) reject(aborted()); };
      signal.addEventListener("abort", cancel, { once: true });
      shared.promise.then(blob => { if (finish()) resolve(blob); }, error => { if (finish()) reject(error); });
    });
  }

  /** Purpose: Resolve a tile. Input: tile coordinates and cancellation signal. Output: real image bytes. */
  async function load(tile: Tile, signal: AbortSignal): Promise<ArrayBuffer> {
    for (let depth = 0; depth <= Math.min(8, tile.z); depth++) {
      if (disposed || signal.aborted) throw aborted();
      const scale = 2 ** depth;
      const blob = await source({ z: tile.z - depth, x: Math.floor(tile.x / scale), y: Math.floor(tile.y / scale) }, signal);
      if (!blob) continue;
      if (!depth) return blob.arrayBuffer();
      const image = await createImageBitmap(blob);
      try {
        if (disposed || signal.aborted) throw aborted();
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d"); if (!context) throw new Error("MAP_IMAGE_UNAVAILABLE");
        context.drawImage(image, tile.x % scale * image.width / scale, tile.y % scale * image.height / scale,
          image.width / scale, image.height / scale, 0, 0, 256, 256);
        const cropped = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("MAP_IMAGE_UNAVAILABLE")), "image/png"));
        return cropped.arrayBuffer();
      } finally { image.close(); }
    }
    throw new Error("MAP_IMAGE_UNAVAILABLE");
  }

  return {
    protocol,
    tiles: [`${protocol}://{z}/{x}/{y}`],
    load: async (url: string, signal: AbortSignal) => {
      const match = url.match(/:\/\/(\d+)\/(\d+)\/(\d+)/);
      if (!match) throw new Error("MAP_TILE_INVALID");
      return load({ z: Number(match[1]), x: Number(match[2]), y: Number(match[3]) }, AbortSignal.any([signal, AbortSignal.timeout(16000)]));
    },
    setLimit: (value: number) => { limit = value; while (active < limit && waiting.size) { const next = waiting.values().next().value!; waiting.delete(next); next(); } },
    dispose: () => { disposed = true; lifecycle.abort(); blocks.clear(); pending.forEach(entry => entry.controller.abort()); pending.clear(); cache.clear(); waiting.forEach(next => next()); waiting.clear(); },
  };
}
// --- end of Tile requests ---
