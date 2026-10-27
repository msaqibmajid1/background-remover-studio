import { useEffect, useRef, useState } from "react";
import { renderStudio, type StudioView } from "@/lib/backgroundStudio/render";
import type { MaskStroke, StudioImage } from "@/lib/backgroundStudio/types";
export type StudioTool = "move" | "erase" | "restore" | "pan";
type Gesture = {
  before: StudioImage;
  start: [number, number];
  type: "move" | "resize" | "stroke" | "pan";
  layer: string;
  stroke?: MaskStroke;
  scroll?: [number, number];
  client?: [number, number];
};
export function StudioCanvas({
  image,
  view,
  compare,
  tool,
  brushSize,
  hardness,
  zoom,
  selectedLayer,
  onSelectLayer,
  onChange,
  onError,
}: {
  image: StudioImage;
  view: StudioView;
  compare: number;
  tool: StudioTool;
  brushSize: number;
  hardness: number;
  zoom: number;
  selectedLayer: string;
  onSelectLayer: (id: string) => void;
  onChange: (image: StudioImage, before?: StudioImage) => void;
  onError: (error: string) => void;
}) {
  const outer = useRef<HTMLDivElement>(null),
    surface = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    gesture = useRef<Gesture | null>(null),
    current = useRef(image);
  const [space, setSpace] = useState(false),
    [viewport, setViewport] = useState({ width: 600, height: 600 }),
    [stroke, setStroke] = useState<MaskStroke>();
  current.current = image;
  const raw = view !== "design",
    width = raw ? image.width : image.design.width,
    height = raw ? image.height : image.design.height;
  const fit = Math.max(
    0.02,
    Math.min((viewport.width - 64) / width, (viewport.height - 64) / height),
  );
  const displayWidth = width * fit * zoom,
    displayHeight = height * fit * zoom;
  const previewEdge = Math.min(
    Math.max(width, height),
    4096,
    Math.max(
      1400,
      Math.ceil(
        (Math.max(displayWidth, displayHeight) *
          Math.min(window.devicePixelRatio || 1, 2)) /
          256,
      ) * 256,
    ),
  );
  const [previewError, setPreviewError] = useState("");
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0].contentRect;
      setViewport({ width: entry.width, height: entry.height });
    });
    if (outer.current) observer.observe(outer.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(
      () => {
        void renderStudio(image, {
          view,
          compare,
          maxEdge: previewEdge,
          stroke,
        })
          .then((result) => {
            if (!cancelled && canvas.current) {
              setPreviewError("");
              canvas.current.width = result.width;
              canvas.current.height = result.height;
              canvas.current.getContext("2d")!.drawImage(result, 0, 0);
            }
            result.width = result.height = 1;
          })
          .catch((error) => {
            if (!cancelled) {
              if (canvas.current)
                canvas.current.width = canvas.current.height = 1;
              setPreviewError(error.message);
              onError(error.message);
            }
          });
      },
      stroke ? 10 : 24,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, view, compare, stroke, onError, previewEdge]);
  useEffect(() => {
    gesture.current = null;
    setStroke(undefined);
    setPreviewError("");
    if (canvas.current) canvas.current.width = canvas.current.height = 1;
  }, [image.id, view]);
  const point = (event: React.PointerEvent): [number, number] => {
    const bounds = surface.current!.getBoundingClientRect();
    return [
      (event.clientX - bounds.left) / bounds.width,
      (event.clientY - bounds.top) / bounds.height,
    ];
  };
  const layer = image.design.overlays.find((item) => item.id === selectedLayer);
  const subjectHeight =
    (image.design.subject.width * image.design.width * image.height) /
    image.width /
    image.design.height;
  const box = layer
    ? {
        x: layer.x + layer.width / 2,
        y: layer.y + layer.height / 2,
        width: layer.width,
        height: layer.height,
        rotation: layer.rotation,
      }
    : { ...image.design.subject, height: subjectHeight };
  const hitLayer = (p: [number, number]) =>
    [...image.design.overlays].reverse().find((layer) => {
      if (layer.locked || !layer.visible) return false;
      const angle = (-layer.rotation * Math.PI) / 180,
        dx = (p[0] - layer.x - layer.width / 2) * width,
        dy = (p[1] - layer.y - layer.height / 2) * height;
      return (
        Math.abs(dx * Math.cos(angle) - dy * Math.sin(angle)) <=
          (layer.width * width) / 2 &&
        Math.abs(dx * Math.sin(angle) + dy * Math.cos(angle)) <=
          (layer.height * height) / 2
      );
    });
  function begin(event: React.PointerEvent<HTMLDivElement>, resize = false) {
    if (event.button !== 0 && event.button !== 1) return;
    if ((tool === "erase" || tool === "restore") && !image.maskKey) return;
    if (
      (tool === "erase" || tool === "restore") &&
      image.strokes.length >= 10000
    ) {
      onError(
        "This image has reached the brush-history limit. Undo or reset brush edits before adding more corrections.",
      );
      return;
    }
    event.preventDefault();
    surface.current!.focus();
    surface.current!.setPointerCapture(event.pointerId);
    const p = point(event),
      before = image;
    if (tool === "pan" || space || event.button === 1) {
      gesture.current = {
        type: "pan",
        before,
        start: p,
        layer: "subject",
        client: [event.clientX, event.clientY],
        scroll: [outer.current!.scrollLeft, outer.current!.scrollTop],
      };
      return;
    }
    if ((tool === "erase" || tool === "restore") && view === "mask") {
      const next: MaskStroke = {
        mode: tool,
        size: brushSize / 1024,
        hardness: hardness / 100,
        points: [p],
      };
      gesture.current = {
        type: "stroke",
        before,
        start: p,
        layer: "subject",
        stroke: next,
      };
      setStroke(next);
      return;
    }
    if (view !== "design") return;
    const target = resize ? selectedLayer : hitLayer(p)?.id || "subject";
    onSelectLayer(target);
    gesture.current = {
      type: resize ? "resize" : "move",
      before,
      start: p,
      layer: target,
    };
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state) return;
    if (state.type === "pan") {
      outer.current!.scrollLeft =
        state.scroll![0] + state.client![0] - event.clientX;
      outer.current!.scrollTop =
        state.scroll![1] + state.client![1] - event.clientY;
      return;
    }
    const p = point(event);
    if (state.type === "stroke") {
      if (p.every((value) => value >= 0 && value <= 1)) {
        const points = state.stroke!.points,
          previous = points[points.length - 1];
        if (
          points.length >= 100000 ||
          Math.hypot(p[0] - previous[0], p[1] - previous[1]) <
            Math.min(0.005, state.stroke!.size / 12)
        )
          return;
        state.stroke = {
          ...state.stroke!,
          points: [...state.stroke!.points, p],
        };
        setStroke(state.stroke);
      }
      return;
    }
    const next = {
        ...state.before,
        design: structuredClone(state.before.design),
      },
      design = next.design,
      target = design.overlays.find((item) => item.id === state.layer);
    const dx = p[0] - state.start[0],
      dy = p[1] - state.start[1];
    if (state.type === "move") {
      if (target) {
        target.x += dx;
        target.y += dy;
      } else {
        design.subject.x += dx;
        design.subject.y += dy;
        design.subject.manual = true;
      }
    } else {
      const center = target
        ? [target.x + target.width / 2, target.y + target.height / 2]
        : [design.subject.x, design.subject.y];
      const distance = (point: [number, number]) =>
        Math.hypot(
          (point[0] - center[0]) * width,
          (point[1] - center[1]) * height,
        );
      const factor = Math.max(
        0.05,
        Math.min(10, distance(p) / Math.max(1, distance(state.start))),
      );
      if (target) {
        const w = Math.max(0.01, Math.min(4, target.width * factor)),
          h = Math.max(0.01, Math.min(4, target.height * factor));
        target.x = center[0] - w / 2;
        target.y = center[1] - h / 2;
        target.width = w;
        target.height = h;
      } else {
        design.subject.width = Math.max(
          0.01,
          Math.min(10, design.subject.width * factor),
        );
        design.subject.manual = true;
      }
    }
    current.current = next;
    onChange(next);
  }
  function end(event: React.PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state) return;
    gesture.current = null;
    if (state.type === "stroke") {
      const next = {
        ...current.current,
        strokes: [...current.current.strokes, state.stroke!],
      };
      onChange(next, state.before);
      setStroke(undefined);
    } else if (state.type !== "pan") onChange(current.current, state.before);
    if (surface.current?.hasPointerCapture(event.pointerId))
      surface.current.releasePointerCapture(event.pointerId);
  }
  return (
    <div
      ref={outer}
      className="relative min-h-0 flex-1 overflow-auto bg-[#eef0f3] dark:bg-[#17191d]"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="flex min-h-full min-w-full p-8">
        <div
          ref={surface}
          tabIndex={0}
          role="img"
          aria-label={`${view} canvas for ${image.name}`}
          className="studio-checker relative m-auto shrink-0 overflow-visible outline-none"
          style={{
            width: displayWidth,
            height: displayHeight,
            touchAction: "none",
            cursor:
              tool === "pan" || space
                ? "grab"
                : tool === "move"
                  ? "move"
                  : "crosshair",
          }}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={(event) => {
            if (event.code === "Space") {
              event.preventDefault();
              setSpace(true);
            }
          }}
          onKeyUp={(event) => {
            if (event.code === "Space") setSpace(false);
          }}
          onBlur={() => setSpace(false)}
        >
          <canvas ref={canvas} className="block h-full w-full shadow-sm" />
          {previewError && (
            <div
              role="alert"
              className="absolute inset-0 flex items-center justify-center bg-background/95 p-5 text-sm text-destructive"
            >
              <p className="max-w-full break-words">{previewError}</p>
            </div>
          )}
          {view === "design" &&
            tool === "move" &&
            (!layer || !layer.locked) && (
              <div
                className="pointer-events-none absolute border border-primary"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                  transform: `translate(-50%,-50%) rotate(${box.rotation}deg)`,
                }}
              >
                <div
                  className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize border border-primary bg-white"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    begin(event, true);
                  }}
                />
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
