import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasElement, TextElement } from "@/types/editor";
import { Type, Palette, Move, Maximize2, RotateCw, Sparkles, Square, Settings2 } from "lucide-react";

interface ApplyStyleToAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentElement: CanvasElement | null;
  allElements: CanvasElement[];
  totalImages: number;
  onApply: (targetElementId: string, properties: string[]) => void;
}

interface PropertyGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  properties: string[];
  description: string;
}

const TEXT_PROPERTY_GROUPS: PropertyGroup[] = [
  {
    id: "content",
    label: "Content",
    icon: <Type className="h-4 w-4" />,
    properties: ["content"],
    description: "Text content",
  },
  {
    id: "position",
    label: "Position",
    icon: <Move className="h-4 w-4" />,
    properties: ["x", "y"],
    description: "X, Y coordinates",
  },
  {
    id: "size",
    label: "Size",
    icon: <Maximize2 className="h-4 w-4" />,
    properties: ["width", "height"],
    description: "Width, Height",
  },
  {
    id: "transform",
    label: "Transform",
    icon: <RotateCw className="h-4 w-4" />,
    properties: ["rotation", "opacity"],
    description: "Rotation, Opacity",
  },
  {
    id: "typography",
    label: "Typography",
    icon: <Type className="h-4 w-4" />,
    properties: [
      "fontFamily", "fontSize", "fontWeight", "fontStyle",
      "textDecoration", "textTransform", "color", "textAlign",
      "lineHeight", "letterSpacing", "wordSpacing"
    ],
    description: "Font, Color, Alignment",
  },
  {
    id: "effects",
    label: "Effects",
    icon: <Sparkles className="h-4 w-4" />,
    properties: [
      "strokeColor", "strokeWidth", "shadow", "shadowColor",
      "shadowBlur", "shadowOffsetX", "shadowOffsetY",
      "colorType", "gradientColor"
    ],
    description: "Stroke, Shadow, Gradient",
  },
  {
    id: "border",
    label: "Border & Padding",
    icon: <Square className="h-4 w-4" />,
    properties: ["borderColor", "borderWidth", "borderRadius", "padding"],
    description: "Border, Radius, Padding",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: <Settings2 className="h-4 w-4" />,
    properties: ["blendMode", "autoFitText"],
    description: "Blend Mode, Auto-Fit",
  },
  {
    id: "wordStyler",
    label: "Word Styler",
    icon: <Palette className="h-4 w-4" />,
    properties: ["wordStyles", "wordStylesEnabled", "wordStyleRules", "wordStyleBgPadding", "wordStyleBgRadius"],
    description: "Rich Text & Styling Config (regenerates for each text)",
  },
];

const SHAPE_PROPERTY_GROUPS: PropertyGroup[] = [
  {
    id: "position",
    label: "Position",
    icon: <Move className="h-4 w-4" />,
    properties: ["x", "y"],
    description: "X, Y coordinates",
  },
  {
    id: "size",
    label: "Size",
    icon: <Maximize2 className="h-4 w-4" />,
    properties: ["width", "height"],
    description: "Width, Height",
  },
  {
    id: "transform",
    label: "Transform",
    icon: <RotateCw className="h-4 w-4" />,
    properties: ["rotation", "opacity"],
    description: "Rotation, Opacity",
  },
  {
    id: "fill",
    label: "Fill",
    icon: <Palette className="h-4 w-4" />,
    properties: ["fillColor", "fillOpacity"],
    description: "Fill Color, Opacity",
  },
  {
    id: "border",
    label: "Border",
    icon: <Square className="h-4 w-4" />,
    properties: ["borderColor", "borderWidth", "borderOpacity", "borderStyle"],
    description: "Border Color, Width, Style",
  },
  {
    id: "effects",
    label: "Effects",
    icon: <Sparkles className="h-4 w-4" />,
    properties: ["shadow", "shadowColor", "shadowBlur"],
    description: "Shadow effects",
  },
];

const IMAGE_PROPERTY_GROUPS: PropertyGroup[] = [
  {
    id: "position",
    label: "Position",
    icon: <Move className="h-4 w-4" />,
    properties: ["x", "y"],
    description: "X, Y coordinates",
  },
  {
    id: "size",
    label: "Size",
    icon: <Maximize2 className="h-4 w-4" />,
    properties: ["width", "height"],
    description: "Width, Height",
  },
  {
    id: "transform",
    label: "Transform",
    icon: <RotateCw className="h-4 w-4" />,
    properties: ["rotation", "opacity", "blendMode"],
    description: "Rotation, Opacity, Blend Mode",
  },
];

export const ApplyStyleToAllDialog = ({
  open,
  onOpenChange,
  currentElement,
  allElements,
  totalImages,
  onApply,
}: ApplyStyleToAllDialogProps) => {
  const [selectedElementId, setSelectedElementId] = useState(currentElement?.id || "");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(["typography", "effects"]);

  // Update selected element when currentElement changes
  useEffect(() => {
    if (currentElement) {
      setSelectedElementId(currentElement.id);
    }
  }, [currentElement?.id]);

  // Get text elements for selection
  const textElements = useMemo(() => 
    allElements.filter(el => el.type === "text") as TextElement[],
    [allElements]
  );

  // Get property groups based on element type
  const propertyGroups = useMemo(() => {
    if (!currentElement) return TEXT_PROPERTY_GROUPS;
    if (currentElement.type === "text") return TEXT_PROPERTY_GROUPS;
    if (currentElement.type === "rectangle" || currentElement.type === "circle") return SHAPE_PROPERTY_GROUPS;
    return IMAGE_PROPERTY_GROUPS;
  }, [currentElement?.type]);

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    setSelectedGroups(propertyGroups.map(g => g.id));
  };

  const handleDeselectAll = () => {
    setSelectedGroups([]);
  };

  const handleApply = () => {
    const allProperties = propertyGroups
      .filter(g => selectedGroups.includes(g.id))
      .flatMap(g => g.properties);
    
    onApply(selectedElementId, allProperties);
    onOpenChange(false);
  };

  const selectedElement = allElements.find(el => el.id === selectedElementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Style to All Images</DialogTitle>
          <DialogDescription>
            Select which element and properties to apply across all {totalImages} images.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Element Selector - Only show for text elements */}
          {currentElement?.type === "text" && textElements.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Element to Update</Label>
              <ScrollArea className="h-[120px] border rounded-md p-2">
                <RadioGroup
                  value={selectedElementId}
                  onValueChange={setSelectedElementId}
                  className="space-y-2"
                >
                  {textElements.map((el) => (
                    <div
                      key={el.id}
                      className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                        selectedElementId === el.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedElementId(el.id)}
                    >
                      <RadioGroupItem value={el.id} id={el.id} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {el.name || `Text ${textElements.indexOf(el) + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {el.content.substring(0, 30)}{el.content.length > 30 ? "..." : ""}
                        </p>
                      </div>
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: el.color }}
                      />
                    </div>
                  ))}
                </RadioGroup>
              </ScrollArea>
            </div>
          )}

          {/* Property Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Properties to Apply</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              <div className="space-y-1">
                {propertyGroups.map((group) => (
                  <div
                    key={group.id}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                      selectedGroups.includes(group.id) ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                    onClick={() => handleToggleGroup(group.id)}
                  >
                    <Checkbox
                      id={group.id}
                      aria-label={group.label}
                      checked={selectedGroups.includes(group.id)}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={() => handleToggleGroup(group.id)}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {group.icon}
                      <div>
                        <p className="text-sm font-medium">{group.label}</p>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <p className="text-muted-foreground">
              Will update <span className="font-medium text-foreground">{selectedElement?.name || "selected element"}</span> on{" "}
              <span className="font-medium text-foreground">{totalImages - 1}</span> other images with{" "}
              <span className="font-medium text-foreground">{selectedGroups.length}</span> property group(s).
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={selectedGroups.length === 0}>
            Apply to All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
