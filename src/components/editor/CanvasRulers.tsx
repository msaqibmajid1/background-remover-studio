import { useRef, useState, useCallback } from "react";

interface Guide {
  id: string;
  position: number;
  orientation: "horizontal" | "vertical";
}

interface CanvasRulersProps {
  width: number;
  height: number;
  zoom: number;
  guides: Guide[];
  onAddGuide: (guide: Guide) => void;
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number) => void;
  showRulers: boolean;
}

const RULER_SIZE = 20;
const TICK_INTERVAL = 50;

export const CanvasRulers = ({
  width,
  height,
  zoom,
  guides,
  onAddGuide,
  onRemoveGuide,
  onUpdateGuide,
  showRulers,
}: CanvasRulersProps) => {
  const [draggingGuide, setDraggingGuide] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRulerClick = useCallback(
    (orientation: "horizontal" | "vertical", e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const position =
        orientation === "horizontal"
          ? (e.clientX - rect.left) / zoom
          : (e.clientY - rect.top) / zoom;

      onAddGuide({
        id: `guide-${Date.now()}`,
        position: Math.round(position),
        orientation,
      });
    },
    [onAddGuide, zoom]
  );

  const handleGuideMouseDown = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDraggingGuide(id);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const guide = guides.find((g) => g.id === id);
        if (!guide || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newPosition =
          guide.orientation === "horizontal"
            ? (moveEvent.clientX - rect.left - RULER_SIZE) / zoom
            : (moveEvent.clientY - rect.top - RULER_SIZE) / zoom;

        onUpdateGuide(id, Math.max(0, Math.round(newPosition)));
      };

      const handleMouseUp = () => {
        setDraggingGuide(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [guides, onUpdateGuide, zoom]
  );

  const handleGuideDoubleClick = useCallback(
    (id: string) => {
      onRemoveGuide(id);
    },
    [onRemoveGuide]
  );

  const renderRulerTicks = (
    length: number,
    orientation: "horizontal" | "vertical"
  ) => {
    const ticks = [];
    const scaledLength = length * zoom;
    const scaledInterval = TICK_INTERVAL * zoom;

    for (let i = 0; i <= scaledLength; i += scaledInterval) {
      const position = i;
      const label = Math.round(i / zoom);

      if (orientation === "horizontal") {
        ticks.push(
          <div
            key={i}
            className="absolute flex flex-col items-center"
            style={{ left: position }}
          >
            <div className="h-2 w-px bg-muted-foreground/50" />
            <span className="text-[8px] text-muted-foreground mt-0.5">
              {label}
            </span>
          </div>
        );
      } else {
        ticks.push(
          <div
            key={i}
            className="absolute flex items-center"
            style={{ top: position }}
          >
            <div className="w-2 h-px bg-muted-foreground/50" />
            <span
              className="text-[8px] text-muted-foreground ml-0.5"
              style={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
              }}
            >
              {label}
            </span>
          </div>
        );
      }
    }

    return ticks;
  };

  if (!showRulers) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Corner */}
      <div
        className="absolute top-0 left-0 bg-muted border-r border-b border-border z-20"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />

      {/* Horizontal Ruler */}
      <div
        className="absolute top-0 bg-muted border-b border-border overflow-hidden pointer-events-auto cursor-crosshair z-10"
        style={{ left: RULER_SIZE, height: RULER_SIZE, width: width * zoom }}
        onClick={(e) => handleRulerClick("vertical", e)}
      >
        <div className="relative h-full">
          {renderRulerTicks(width, "horizontal")}
        </div>
      </div>

      {/* Vertical Ruler */}
      <div
        className="absolute left-0 bg-muted border-r border-border overflow-hidden pointer-events-auto cursor-crosshair z-10"
        style={{ top: RULER_SIZE, width: RULER_SIZE, height: height * zoom }}
        onClick={(e) => handleRulerClick("horizontal", e)}
      >
        <div className="relative w-full">
          {renderRulerTicks(height, "vertical")}
        </div>
      </div>

      {/* Guides */}
      {guides.map((guide) => (
        <div
          key={guide.id}
          className={`absolute pointer-events-auto ${
            draggingGuide === guide.id ? "z-30" : "z-20"
          }`}
          style={
            guide.orientation === "horizontal"
              ? {
                  top: guide.position * zoom + RULER_SIZE,
                  left: RULER_SIZE,
                  width: width * zoom,
                  height: 1,
                }
              : {
                  left: guide.position * zoom + RULER_SIZE,
                  top: RULER_SIZE,
                  width: 1,
                  height: height * zoom,
                }
          }
        >
          <div
            className={`${
              guide.orientation === "horizontal" ? "w-full h-px" : "h-full w-px"
            } bg-cyan-500 cursor-move`}
            style={{
              boxShadow: "0 0 2px rgba(0, 255, 255, 0.5)",
            }}
            onMouseDown={(e) => handleGuideMouseDown(guide.id, e)}
            onDoubleClick={() => handleGuideDoubleClick(guide.id)}
          />
          <div
            className={`absolute text-[10px] bg-cyan-500 text-white px-1 rounded ${
              guide.orientation === "horizontal"
                ? "-left-1 -top-3"
                : "-top-1 -left-3"
            }`}
          >
            {guide.position}
          </div>
        </div>
      ))}
    </div>
  );
};

export type { Guide };
