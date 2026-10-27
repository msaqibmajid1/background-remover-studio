import { CanvasElement } from "@/types/editor";

export interface SmartGuide {
  type: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
  snapType: "left" | "center" | "right" | "top" | "middle" | "bottom";
}

const SNAP_THRESHOLD = 8;

export function calculateSmartGuides(
  draggingElement: CanvasElement,
  allElements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number
): { guides: SmartGuide[]; snappedPosition: { x: number; y: number } } {
  const guides: SmartGuide[] = [];
  let snappedX = draggingElement.x;
  let snappedY = draggingElement.y;
  
  // Calculate dragging element edges and center
  const dragLeft = draggingElement.x;
  const dragRight = draggingElement.x + draggingElement.width;
  const dragCenterX = draggingElement.x + draggingElement.width / 2;
  const dragTop = draggingElement.y;
  const dragBottom = draggingElement.y + draggingElement.height;
  const dragCenterY = draggingElement.y + draggingElement.height / 2;
  
  // Canvas center guides
  const canvasCenterX = canvasWidth / 2;
  const canvasCenterY = canvasHeight / 2;
  
  // Check canvas center alignment
  if (Math.abs(dragCenterX - canvasCenterX) < SNAP_THRESHOLD) {
    snappedX = canvasCenterX - draggingElement.width / 2;
    guides.push({
      type: "vertical",
      position: canvasCenterX,
      start: 0,
      end: canvasHeight,
      snapType: "center",
    });
  }
  
  if (Math.abs(dragCenterY - canvasCenterY) < SNAP_THRESHOLD) {
    snappedY = canvasCenterY - draggingElement.height / 2;
    guides.push({
      type: "horizontal",
      position: canvasCenterY,
      start: 0,
      end: canvasWidth,
      snapType: "middle",
    });
  }
  
  // Check canvas edges
  if (Math.abs(dragLeft) < SNAP_THRESHOLD) {
    snappedX = 0;
    guides.push({
      type: "vertical",
      position: 0,
      start: 0,
      end: canvasHeight,
      snapType: "left",
    });
  }
  if (Math.abs(dragRight - canvasWidth) < SNAP_THRESHOLD) {
    snappedX = canvasWidth - draggingElement.width;
    guides.push({
      type: "vertical",
      position: canvasWidth,
      start: 0,
      end: canvasHeight,
      snapType: "right",
    });
  }
  if (Math.abs(dragTop) < SNAP_THRESHOLD) {
    snappedY = 0;
    guides.push({
      type: "horizontal",
      position: 0,
      start: 0,
      end: canvasWidth,
      snapType: "top",
    });
  }
  if (Math.abs(dragBottom - canvasHeight) < SNAP_THRESHOLD) {
    snappedY = canvasHeight - draggingElement.height;
    guides.push({
      type: "horizontal",
      position: canvasHeight,
      start: 0,
      end: canvasWidth,
      snapType: "bottom",
    });
  }
  
  // Check against other elements
  for (const element of allElements) {
    // Skip self, hidden elements, and elements in the same group
    if (
      element.id === draggingElement.id ||
      element.visible === false ||
      (draggingElement.groupId && element.groupId === draggingElement.groupId)
    ) {
      continue;
    }
    
    const elLeft = element.x;
    const elRight = element.x + element.width;
    const elCenterX = element.x + element.width / 2;
    const elTop = element.y;
    const elBottom = element.y + element.height;
    const elCenterY = element.y + element.height / 2;
    
    // Vertical alignments (left, center, right)
    // Left to left
    if (Math.abs(dragLeft - elLeft) < SNAP_THRESHOLD) {
      snappedX = elLeft;
      guides.push({
        type: "vertical",
        position: elLeft,
        start: Math.min(dragTop, elTop),
        end: Math.max(dragBottom, elBottom),
        snapType: "left",
      });
    }
    // Right to right
    if (Math.abs(dragRight - elRight) < SNAP_THRESHOLD) {
      snappedX = elRight - draggingElement.width;
      guides.push({
        type: "vertical",
        position: elRight,
        start: Math.min(dragTop, elTop),
        end: Math.max(dragBottom, elBottom),
        snapType: "right",
      });
    }
    // Center to center
    if (Math.abs(dragCenterX - elCenterX) < SNAP_THRESHOLD) {
      snappedX = elCenterX - draggingElement.width / 2;
      guides.push({
        type: "vertical",
        position: elCenterX,
        start: Math.min(dragTop, elTop),
        end: Math.max(dragBottom, elBottom),
        snapType: "center",
      });
    }
    // Left to right
    if (Math.abs(dragLeft - elRight) < SNAP_THRESHOLD) {
      snappedX = elRight;
      guides.push({
        type: "vertical",
        position: elRight,
        start: Math.min(dragTop, elTop),
        end: Math.max(dragBottom, elBottom),
        snapType: "left",
      });
    }
    // Right to left
    if (Math.abs(dragRight - elLeft) < SNAP_THRESHOLD) {
      snappedX = elLeft - draggingElement.width;
      guides.push({
        type: "vertical",
        position: elLeft,
        start: Math.min(dragTop, elTop),
        end: Math.max(dragBottom, elBottom),
        snapType: "right",
      });
    }
    
    // Horizontal alignments (top, middle, bottom)
    // Top to top
    if (Math.abs(dragTop - elTop) < SNAP_THRESHOLD) {
      snappedY = elTop;
      guides.push({
        type: "horizontal",
        position: elTop,
        start: Math.min(dragLeft, elLeft),
        end: Math.max(dragRight, elRight),
        snapType: "top",
      });
    }
    // Bottom to bottom
    if (Math.abs(dragBottom - elBottom) < SNAP_THRESHOLD) {
      snappedY = elBottom - draggingElement.height;
      guides.push({
        type: "horizontal",
        position: elBottom,
        start: Math.min(dragLeft, elLeft),
        end: Math.max(dragRight, elRight),
        snapType: "bottom",
      });
    }
    // Middle to middle
    if (Math.abs(dragCenterY - elCenterY) < SNAP_THRESHOLD) {
      snappedY = elCenterY - draggingElement.height / 2;
      guides.push({
        type: "horizontal",
        position: elCenterY,
        start: Math.min(dragLeft, elLeft),
        end: Math.max(dragRight, elRight),
        snapType: "middle",
      });
    }
    // Top to bottom
    if (Math.abs(dragTop - elBottom) < SNAP_THRESHOLD) {
      snappedY = elBottom;
      guides.push({
        type: "horizontal",
        position: elBottom,
        start: Math.min(dragLeft, elLeft),
        end: Math.max(dragRight, elRight),
        snapType: "top",
      });
    }
    // Bottom to top
    if (Math.abs(dragBottom - elTop) < SNAP_THRESHOLD) {
      snappedY = elTop - draggingElement.height;
      guides.push({
        type: "horizontal",
        position: elTop,
        start: Math.min(dragLeft, elLeft),
        end: Math.max(dragRight, elRight),
        snapType: "bottom",
      });
    }
  }
  
  return { guides, snappedPosition: { x: snappedX, y: snappedY } };
}

export function drawSmartGuides(
  ctx: CanvasRenderingContext2D,
  guides: SmartGuide[]
) {
  ctx.save();
  ctx.strokeStyle = "hsl(340 80% 55%)"; // Magenta/pink color like design tools
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  
  const uniqueGuides = guides.reduce((acc, guide) => {
    const key = `${guide.type}-${guide.position}`;
    if (!acc.has(key)) {
      acc.set(key, guide);
    } else {
      // Extend existing guide
      const existing = acc.get(key)!;
      existing.start = Math.min(existing.start, guide.start);
      existing.end = Math.max(existing.end, guide.end);
    }
    return acc;
  }, new Map<string, SmartGuide>());
  
  uniqueGuides.forEach(guide => {
    ctx.beginPath();
    if (guide.type === "vertical") {
      ctx.moveTo(guide.position, guide.start);
      ctx.lineTo(guide.position, guide.end);
    } else {
      ctx.moveTo(guide.start, guide.position);
      ctx.lineTo(guide.end, guide.position);
    }
    ctx.stroke();
    
    // Draw small circles at intersections
    ctx.fillStyle = "hsl(340 80% 55%)";
    ctx.beginPath();
    if (guide.type === "vertical") {
      ctx.arc(guide.position, guide.start, 3, 0, Math.PI * 2);
      ctx.arc(guide.position, guide.end, 3, 0, Math.PI * 2);
    } else {
      ctx.arc(guide.start, guide.position, 3, 0, Math.PI * 2);
      ctx.arc(guide.end, guide.position, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  });
  
  ctx.restore();
}
