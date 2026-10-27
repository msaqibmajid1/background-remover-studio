import { CanvasElement } from "@/types/editor";
import { Button } from "@/components/ui/button";
import {
  AlignLeft,
  AlignRight,
  AlignCenterHorizontal,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { toast } from "sonner";

interface AlignmentToolsProps {
  selectedElements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  onUpdateElements: (elements: CanvasElement[]) => void;
}

export const AlignmentTools = ({
  selectedElements,
  canvasWidth,
  canvasHeight,
  onUpdateElements,
}: AlignmentToolsProps) => {
  if (selectedElements.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select elements to use alignment tools
      </div>
    );
  }

  const alignLeft = () => {
    const minX = Math.min(...selectedElements.map((el) => el.x));
    const updated = selectedElements.map((el) => ({ ...el, x: minX }));
    onUpdateElements(updated);
    toast.success("Aligned left");
  };

  const alignRight = () => {
    const maxRight = Math.max(...selectedElements.map((el) => el.x + el.width));
    const updated = selectedElements.map((el) => ({
      ...el,
      x: maxRight - el.width,
    }));
    onUpdateElements(updated);
    toast.success("Aligned right");
  };

  const alignTop = () => {
    const minY = Math.min(...selectedElements.map((el) => el.y));
    const updated = selectedElements.map((el) => ({ ...el, y: minY }));
    onUpdateElements(updated);
    toast.success("Aligned top");
  };

  const alignBottom = () => {
    const maxBottom = Math.max(...selectedElements.map((el) => el.y + el.height));
    const updated = selectedElements.map((el) => ({
      ...el,
      y: maxBottom - el.height,
    }));
    onUpdateElements(updated);
    toast.success("Aligned bottom");
  };

  const alignCenterHorizontal = () => {
    const centerX = canvasWidth / 2;
    const updated = selectedElements.map((el) => ({
      ...el,
      x: centerX - el.width / 2,
    }));
    onUpdateElements(updated);
    toast.success("Centered horizontally");
  };

  const alignCenterVertical = () => {
    const centerY = canvasHeight / 2;
    const updated = selectedElements.map((el) => ({
      ...el,
      y: centerY - el.height / 2,
    }));
    onUpdateElements(updated);
    toast.success("Centered vertically");
  };

  const distributeHorizontal = () => {
    if (selectedElements.length < 3) {
      toast.error("Need at least 3 elements to distribute");
      return;
    }

    const sorted = [...selectedElements].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
    const totalWidth = maxX - minX;
    const gap = (totalWidth - sorted.reduce((sum, el) => sum + el.width, 0)) / (sorted.length - 1);

    let currentX = minX;
    const updated = sorted.map((el) => {
      const newEl = { ...el, x: currentX };
      currentX += el.width + gap;
      return newEl;
    });

    onUpdateElements(updated);
    toast.success("Distributed horizontally");
  };

  const distributeVertical = () => {
    if (selectedElements.length < 3) {
      toast.error("Need at least 3 elements to distribute");
      return;
    }

    const sorted = [...selectedElements].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const maxY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
    const totalHeight = maxY - minY;
    const gap = (totalHeight - sorted.reduce((sum, el) => sum + el.height, 0)) / (sorted.length - 1);

    let currentY = minY;
    const updated = sorted.map((el) => {
      const newEl = { ...el, y: currentY };
      currentY += el.height + gap;
      return newEl;
    });

    onUpdateElements(updated);
    toast.success("Distributed vertically");
  };

  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold mb-2">
          {selectedElements.length} element{selectedElements.length !== 1 ? "s" : ""} selected
        </p>
      </div>

      <div>
        <p className="text-xs mb-2">Align</p>
        <div className="grid grid-cols-3 gap-1">
          <Button size="sm" variant="outline" onClick={alignLeft} title="Align Left">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={alignCenterHorizontal} title="Center Horizontal">
            <AlignCenterHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={alignRight} title="Align Right">
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={alignTop} title="Align Top">
            <AlignStartVertical className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={alignCenterVertical} title="Center Vertical">
            <AlignCenterVertical className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={alignBottom} title="Align Bottom">
            <AlignEndVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedElements.length >= 3 && (
        <div>
          <p className="text-xs mb-2">Distribute</p>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="outline" onClick={distributeHorizontal} title="Distribute Horizontal">
              <AlignHorizontalDistributeCenter className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={distributeVertical} title="Distribute Vertical">
              <AlignVerticalDistributeCenter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
