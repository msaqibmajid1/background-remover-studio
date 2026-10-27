import { CanvasElement } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Lock, Unlock, Type, Image, Square, Circle, Star, Hexagon, Minus, ArrowRight, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LayersPanelProps {
  elements: CanvasElement[];
  selectedElement: CanvasElement | null;
  onSelectElement: (element: CanvasElement) => void;
  onUpdateElement: (element: CanvasElement) => void;
  onReorderElements: (elements: CanvasElement[]) => void;
  onApplyToAll?: (element: CanvasElement) => void;
}

export const LayersPanel = ({
  elements,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onReorderElements,
  onApplyToAll,
}: LayersPanelProps) => {
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const getElementIcon = (type: CanvasElement["type"]) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "logo":
      case "watermark":
      case "image":
        return <Image className="h-4 w-4" />;
      case "rectangle":
        return <Square className="h-4 w-4" />;
      case "circle":
        return <Circle className="h-4 w-4" />;
      case "star":
        return <Star className="h-4 w-4" />;
      case "polygon":
        return <Hexagon className="h-4 w-4" />;
      case "line":
        return <Minus className="h-4 w-4" />;
      case "arrow":
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  const getElementLabel = (element: CanvasElement) => {
    if (element.type === "text") {
      return element.content.substring(0, 20) || "Text";
    }
    return element.type.charAt(0).toUpperCase() + element.type.slice(1);
  };

  const toggleVisibility = (element: CanvasElement) => {
    onUpdateElement({
      ...element,
      visible: element.visible === false ? true : false,
    });
  };

  const toggleLock = (element: CanvasElement) => {
    onUpdateElement({
      ...element,
      locked: !element.locked,
    });
  };

  const moveLayer = (element: CanvasElement, direction: "up" | "down") => {
    const currentIndex = sortedElements.findIndex((e) => e.id === element.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === sortedElements.length - 1)
    ) {
      return;
    }

    const newElements = [...sortedElements];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    [newElements[currentIndex], newElements[targetIndex]] = [
      newElements[targetIndex],
      newElements[currentIndex],
    ];

    // Update zIndex values
    const reindexed = newElements.map((el, idx) => ({
      ...el,
      zIndex: newElements.length - idx - 1,
    }));

    onReorderElements(reindexed);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">Layers</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {elements.length} element{elements.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sortedElements.map((element) => (
            <div
              key={element.id}
              className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors ${
                selectedElement?.id === element.id ? "bg-muted border border-primary" : ""
              } ${element.visible === false ? "opacity-50" : ""} ${
                element.groupId ? "border-l-2 border-l-blue-400" : ""
              } ${element.locked ? "bg-muted/30" : ""}`}
              onClick={() => !element.locked && onSelectElement(element)}
            >
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(element);
                      }}
                    >
                      {element.visible === false ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{element.visible === false ? "Show" : "Hide"} Layer</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={element.locked ? "secondary" : "ghost"}
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(element);
                      }}
                    >
                      {element.locked ? (
                        <Lock className="h-3 w-3 text-amber-500" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{element.locked ? "Unlock" : "Lock"} Layer</p>
                    <p className="text-xs text-muted-foreground">
                      {element.locked ? "Allow editing" : "Prevent changes"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getElementIcon(element.type)}
                <span className={`text-sm truncate ${element.locked ? "text-muted-foreground" : ""}`}>
                  {getElementLabel(element)}
                </span>
                {element.templateCode && (
                  <span className="text-[10px] px-1 py-0.5 bg-muted text-muted-foreground rounded font-mono" title={`Template: ${element.templateCode}`}>
                    {element.templateCode.slice(-6)}
                  </span>
                )}
                {element.groupId && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">
                    Group
                  </span>
                )}
                {element.locked && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">
                    Locked
                  </span>
                )}
              </div>

              <div className="flex gap-1">
                {element.locked && onApplyToAll && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyToAll(element);
                        }}
                      >
                        <Copy className="h-3 w-3 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Apply to All Images</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(element, "up");
                      }}
                      disabled={sortedElements.indexOf(element) === 0}
                    >
                      ↑
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Move Up</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(element, "down");
                      }}
                      disabled={sortedElements.indexOf(element) === sortedElements.length - 1}
                    >
                      ↓
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Move Down</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
