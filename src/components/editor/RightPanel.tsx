import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorImage, CanvasElement } from "@/types/editor";
import { ElementPropertiesPanel } from "./ElementPropertiesPanel";
import { LayersPanel } from "./LayersPanel";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RightPanelProps {
  currentImage: EditorImage | null;
  selectedElement: CanvasElement | null;
  selectedElements: string[];
  onUpdateElement: (element: CanvasElement) => void;
  onDeleteElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onApplyElementToAll: (styleOnly: boolean) => void;
  onApplyStyleToAll?: () => void;
  hasMultipleImages: boolean;
  onSelectElement: (element: CanvasElement, shiftKey?: boolean) => void;
  onReorderElements: (elements: CanvasElement[]) => void;
  onUpdateElements: (elements: CanvasElement[]) => void;
  onApplyToAllFromLayer?: (element: CanvasElement) => void;
  onBatchUpdateText?: () => void;
  onBatchUploadImage?: () => void;
  onUpdateElementPreview?: (element: CanvasElement) => void;
  onApplyImageToCanvasBackground?: (src: string, opacity: number, convertToBlank?: boolean) => void;
}

export const RightPanel = React.memo(({
  currentImage,
  selectedElement,
  selectedElements,
  onUpdateElement,
  onUpdateElementPreview,
  onDeleteElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onApplyElementToAll,
  onApplyStyleToAll,
  hasMultipleImages,
  onSelectElement,
  onReorderElements,
  onApplyToAllFromLayer,
  onBatchUpdateText,
  onBatchUploadImage,
  onApplyImageToCanvasBackground,
}: RightPanelProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`border-l border-panel-border bg-panel h-full flex flex-col transition-all duration-200 ${isMinimized ? 'w-10' : 'w-80'}`} data-onboarding="properties">
      {/* Header with minimize */}
      <div className="flex items-center px-2 py-2 border-b border-panel-border bg-muted/30 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setIsMinimized(!isMinimized)}
          title={isMinimized ? "Expand panel" : "Collapse panel"}
        >
          {isMinimized ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {!isMinimized && <span className="text-xs font-medium text-muted-foreground ml-2">Properties</span>}
      </div>

      {!isMinimized && (
      <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 rounded-none border-b text-xs">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="properties">Props</TabsTrigger>
          <TabsTrigger value="layers">Layers</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="info" className="p-4 space-y-4 m-0">
            {currentImage ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Filename</Label>
                  <p className="text-sm font-medium">{currentImage.file.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">File Size</Label>
                  <p className="text-sm font-medium">
                    {(currentImage.file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dimensions</Label>
                  <p className="text-sm font-medium">
                    {currentImage.originalWidth} × {currentImage.originalHeight}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Canvas Size</Label>
                  <p className="text-sm font-medium">
                    {currentImage.canvasSize.width} × {currentImage.canvasSize.height}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                  <p className="text-sm font-medium">
                    {currentImage.canvasSize.aspectRatio}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Elements</Label>
                  <p className="text-sm font-medium">{currentImage.elements.length}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Filter</Label>
                  <p className="text-sm font-medium capitalize">
                    {currentImage.filter.type}
                    {currentImage.filter.value && ` (${currentImage.filter.value})`}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No image loaded
              </div>
            )}
          </TabsContent>

          <TabsContent value="properties" className="p-4 space-y-4 m-0">
            {selectedElement ? (
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={onUpdateElement}
                onUpdatePreview={onUpdateElementPreview}
                onDelete={onDeleteElement}
                onBringForward={onBringForward}
                onSendBackward={onSendBackward}
                onBringToFront={onBringToFront}
                onSendToBack={onSendToBack}
                canApplyToAll={hasMultipleImages}
                onApplyToAll={onApplyElementToAll}
                onApplyStyleToAll={onApplyStyleToAll}
                onBatchUpdateText={onBatchUpdateText}
                onBatchUploadImage={onBatchUploadImage}
                hasMultipleImages={hasMultipleImages}
                canvasWidth={currentImage?.canvasSize.width}
                canvasHeight={currentImage?.canvasSize.height}
                backgroundImageSrc={currentImage?.src || null}
                isBlankCanvas={!!currentImage?.isBlankCanvas}
                onApplyImageToCanvasBackground={onApplyImageToCanvasBackground}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No Element Selected
              </div>
            )}
          </TabsContent>

          <TabsContent value="layers" className="m-0 h-full">
            {currentImage ? (
              <LayersPanel
                elements={currentImage.elements}
                selectedElement={selectedElement}
                onSelectElement={onSelectElement}
                onUpdateElement={onUpdateElement}
                onReorderElements={onReorderElements}
                onApplyToAll={hasMultipleImages ? onApplyToAllFromLayer : undefined}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8 px-4">
                No image loaded
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
      )}
    </div>
  );
});
