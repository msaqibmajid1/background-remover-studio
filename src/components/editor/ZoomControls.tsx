import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
}

export const ZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
}: ZoomControlsProps) => {
  return (
    <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Zoom Out</p>
          <p className="text-xs text-muted-foreground">Ctrl + -</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomReset}
            className="h-7 px-2 min-w-[3.5rem] text-xs font-medium"
          >
            {Math.round(zoom * 100)}%
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Reset to 100%</p>
          <p className="text-xs text-muted-foreground">Ctrl + 0</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            disabled={zoom >= 4}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Zoom In</p>
          <p className="text-xs text-muted-foreground">Ctrl + +</p>
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-5 bg-border mx-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomFit}
            className="h-7 w-7 p-0"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Fit to View</p>
          <p className="text-xs text-muted-foreground">Ctrl + 1</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
