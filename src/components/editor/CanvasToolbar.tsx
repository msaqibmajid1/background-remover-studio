import { Button } from "@/components/ui/button";
import { Grid3X3, Ruler, Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanvasToolbarProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  showGuides: boolean;
  onToggleGuides: () => void;
}

export const CanvasToolbar = ({
  showGrid,
  onToggleGrid,
  gridSize,
  onGridSizeChange,
  snapToGrid,
  onToggleSnapToGrid,
  showRulers,
  onToggleRulers,
  showGuides,
  onToggleGuides,
}: CanvasToolbarProps) => {
  return (
    <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-sm">
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={showGrid ? "default" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Grid Settings</p>
            <p className="text-xs text-muted-foreground">Ctrl + G</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-56" side="top">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-grid" className="text-sm">Show Grid</Label>
              <Switch
                id="show-grid"
                checked={showGrid}
                onCheckedChange={onToggleGrid}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="snap-grid" className="text-sm">Snap to Grid</Label>
              <Switch
                id="snap-grid"
                checked={snapToGrid}
                onCheckedChange={onToggleSnapToGrid}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Grid Size (px)</Label>
              <Input
                type="number"
                min={5}
                max={100}
                value={gridSize}
                onChange={(e) => onGridSizeChange(parseInt(e.target.value) || 10)}
                className="h-8"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showRulers ? "default" : "ghost"}
            size="sm"
            onClick={onToggleRulers}
            className="h-7 w-7 p-0"
          >
            <Ruler className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Toggle Rulers</p>
          <p className="text-xs text-muted-foreground">Ctrl + R</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={showGuides ? "default" : "ghost"}
            size="sm"
            onClick={onToggleGuides}
            className="h-7 w-7 p-0"
          >
            {showGuides ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{showGuides ? "Hide" : "Show"} Guides</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
