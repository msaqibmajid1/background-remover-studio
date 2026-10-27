export type ImageRole = { kind: "base"; slot: number } | { kind: "shape" };
export type ImageFailureReason = { code: string; message: string; httpStatus?: number; contentType?: string };
export type CollageImageFailure = ImageFailureReason & { imageId: string; title: string; roles: ImageRole[] };

export const imageRoleLabel = (role: ImageRole) => role.kind === "shape" ? "Shape image" : `Base slot ${role.slot}`;

export class ImageLoadError extends Error {
  constructor(public reason: ImageFailureReason) { super(reason.message); this.name = "ImageLoadError"; }
}

export function imageFailureReason(error: unknown, diagnostics: { httpStatus?: number; contentType?: string } = {}): ImageFailureReason {
  if (error instanceof ImageLoadError) return error.reason;
  const raw = error instanceof Error ? error.message : String(error || "Image download failed");
  const status = diagnostics.httpStatus || Number(raw.match(/(?:HTTP|status|failed)[^\d]*(\d{3})/i)?.[1]) || undefined;
  const contentType = diagnostics.contentType?.split(";")[0].trim().toLowerCase();
  const info = { ...(status ? { httpStatus: status } : {}), ...(contentType ? { contentType } : {}) };
  if (status && status >= 400) {
    const message = status === 404 || status === 410 ? "The original image link is missing or expired. Replace this image."
      : status === 401 || status === 403 ? "The image server denied access. The link may require sign-in or reject direct downloads."
      : status === 429 ? "The image server rate-limited this request. Wait before retrying."
      : status >= 500 ? "The image server is temporarily unavailable. Retry later or replace this image."
      : "The image server rejected the download. Retry or replace this image.";
    return { code: "http", message: `HTTP ${status}: ${message}`, ...info };
  }
  if (contentType && !contentType.startsWith("image/")) return { code: "not-image", message: `The link returned ${contentType}, not an image. It may be a page or expired link; replace this image.`, ...info };
  if (/timeout|timed out|aborted/i.test(raw)) return { code: "timeout", message: "The original image download timed out. Check the connection, then retry or replace this image.", ...info };
  if (/could not load image|decode|corrupt/i.test(raw)) return { code: "decode", message: "The original image could not be decoded. It may be damaged or unsupported; replace this image.", ...info };
  if (/failed to fetch|network|load failed/i.test(raw)) return { code: "network", message: "The browser could not reach the image server. A connection failure or browser cross-origin block may be responsible; retry or replace this image.", ...info };
  if (/not.*image|original image|all fetch strategies failed/i.test(raw)) return { code: "unavailable", message: "The original image was not available from the source. A visible thumbnail does not mean the full image can be downloaded; replace this image.", ...info };
  return { code: "unknown", message: `Image download failed: ${raw}`, ...info };
}

export class CollageImageExportError extends Error {
  constructor(public imageFailures: CollageImageFailure[]) {
    super(imageFailures.map(failure => `${failure.roles.map(imageRoleLabel).join(" / ")} (${failure.title}): ${failure.message}`).join("\n"));
    this.name = "CollageImageExportError";
  }
}

export function validImageFailures(value: unknown): CollageImageFailure[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CollageImageFailure => !!item && typeof item.imageId === "string" && typeof item.title === "string" && typeof item.message === "string" && typeof item.code === "string" && Array.isArray(item.roles) && item.roles.length > 0 && item.roles.every((role: ImageRole) => role?.kind === "shape" || (role?.kind === "base" && Number.isInteger(role.slot) && role.slot > 0)));
}
