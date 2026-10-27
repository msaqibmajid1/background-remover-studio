import type { StudioOverlay } from "./types";

export type CanvasAlignment =
  | "left"
  | "horizontal-center"
  | "right"
  | "top"
  | "vertical-center"
  | "bottom";

export function alignOverlayToCanvas(
  layer: Pick<StudioOverlay, "width" | "height">,
  alignment: CanvasAlignment,
): Partial<Pick<StudioOverlay, "x" | "y">> {
  switch (alignment) {
    case "left":
      return { x: 0 };
    case "horizontal-center":
      return { x: (1 - layer.width) / 2 };
    case "right":
      return { x: 1 - layer.width };
    case "top":
      return { y: 0 };
    case "vertical-center":
      return { y: (1 - layer.height) / 2 };
    case "bottom":
      return { y: 1 - layer.height };
  }
}
