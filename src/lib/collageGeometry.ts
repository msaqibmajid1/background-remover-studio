export type Placement = { zoom: number; offsetX: number; offsetY: number };
export type Rect = { x: number; y: number; w: number; h: number };

export function coverImageRect(image: { width: number; height: number }, rect: Rect, placement: Placement): Rect {
  const width = image.width > 0 ? image.width : rect.w;
  const height = image.height > 0 ? image.height : rect.h;
  const scale = Math.max(rect.w / width, rect.h / height) * Math.max(0.25, placement.zoom / 100);
  const w = width * scale;
  const h = height * scale;
  return {
    x: rect.x + (rect.w - w) / 2 + placement.offsetX / 100 * Math.abs(w - rect.w) / 2,
    y: rect.y + (rect.h - h) / 2 + placement.offsetY / 100 * Math.abs(h - rect.h) / 2,
    w,
    h,
  };
}

export function reconcileSlots(ids: (string | null)[], imageIds: string[], count: number) {
  // Explicitly cleared slots stay empty; only new slots are initialized.
  return Array.from({ length: count }, (_, index) => index < ids.length ? ids[index] : imageIds[index] || null);
}

export function collageFilename(term: string, fallback: string) {
  return term.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").replace(/\s+/g, "-").replace(/[. ]+$/g, "").slice(0, 100) || fallback;
}

export function shapeImageForEntry(sourceId: string | null, targetId: string | null, sharedIds: string[], targetImageIds: string[]) {
  return sourceId && (sharedIds.includes(sourceId) || targetImageIds.includes(sourceId)) ? sourceId : targetId;
}
