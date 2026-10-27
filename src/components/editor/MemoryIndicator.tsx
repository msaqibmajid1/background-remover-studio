import { useState, useEffect, useCallback } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

interface MemoryIndicatorProps {
  onClearCache?: () => void;
}

export const MemoryIndicator = ({ onClearCache }: MemoryIndicatorProps) => {
  const [memory, setMemory] = useState<MemoryInfo | null>(null);

  const updateMemory = useCallback(() => {
    const perf = performance as Performance & { memory?: MemoryInfo };
    if (perf.memory) {
      setMemory({
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
        jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      });
    }
  }, []);

  useEffect(() => {
    const perf = performance as Performance & { memory?: MemoryInfo };
    if (!perf.memory) return;
    updateMemory();
    const interval = setInterval(updateMemory, 5000);
    return () => clearInterval(interval);
  }, [updateMemory]);

  const handleClearCache = () => {
    const before = memory?.usedJSHeapSize ?? 0;
    
    // Clear undo/redo history thumbnails from sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      for (const key of keys) {
        if (key.startsWith('editor_') || key.startsWith('canvas_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {}

    // Trigger parent cache cleanup
    onClearCache?.();

    // Force update memory reading after a short delay
    setTimeout(() => {
      updateMemory();
      const after = memory?.usedJSHeapSize ?? 0;
      const freed = before - after;
      toast.success(
        freed > 0
          ? `Freed ~${formatBytes(freed)} of memory`
          : "Cache cleared. Memory will be reclaimed shortly."
      );
    }, 500);
  };

  if (!memory) return null;

  const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  const level = usagePercent > 80 ? "critical" : usagePercent > 50 ? "warning" : "normal";

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-default",
            level === "critical" && "bg-destructive/10 text-destructive",
            level === "warning" && "bg-accent/50 text-accent-foreground",
            level === "normal" && "bg-muted text-muted-foreground"
          )}>
            <HardDrive className="h-3 w-3" />
            <span>{formatBytes(memory.usedJSHeapSize)}</span>
            <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  level === "critical" && "bg-destructive",
                  level === "warning" && "bg-accent",
                  level === "normal" && "bg-primary"
                )}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">Memory Usage</p>
            <p>Used: {formatBytes(memory.usedJSHeapSize)}</p>
            <p>Allocated: {formatBytes(memory.totalJSHeapSize)}</p>
            <p>Limit: {formatBytes(memory.jsHeapSizeLimit)}</p>
            <p>Usage: {usagePercent.toFixed(1)}%</p>
            {level === "critical" && (
              <p className="text-destructive font-medium">⚠ High memory — clear cache or remove images</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClearCache}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear cached data to free memory</p>
        </TooltipContent>
      </Tooltip>

    </div>
  );
};
