import { useState, useRef, useEffect, memo } from "react";
import { EditorImage } from "@/types/editor";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FilmstripPreviewProps {
  images: EditorImage[];
  currentImageIndex: number;
  onSelectImage: (index: number) => void;
  onRemoveImage?: (index: number) => void;
  thumbnailMap?: Map<string, string>;
}

const FilmstripPreviewInner = ({
  images,
  currentImageIndex,
  onSelectImage,
  onRemoveImage,
  thumbnailMap,
}: FilmstripPreviewProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 20]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  if (images.length === 0) return null;

  // For large sets, only render items near the visible area
  const BUFFER = 10;
  const renderStart = Math.max(0, visibleRange[0] - BUFFER);
  const renderEnd = Math.min(images.length, visibleRange[1] + BUFFER);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollLeft = containerRef.current.scrollLeft;
    const itemWidth = 60; // approximate width per thumbnail
    const viewportWidth = containerRef.current.clientWidth;
    const startIdx = Math.floor(scrollLeft / itemWidth);
    const endIdx = Math.ceil((scrollLeft + viewportWidth) / itemWidth);
    setVisibleRange([startIdx, endIdx]);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl overflow-hidden max-w-[90%]">
      {/* Header with minimize button */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/50">
        <span className="text-xs font-medium text-muted-foreground">
          Images ({images.length})
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>
      
      {/* Content - collapsible */}
      {!isMinimized && (
        <div className="p-2">
          <ScrollArea className="w-full" onScrollCapture={handleScroll}>
            <div ref={containerRef} className="flex gap-2 p-1" style={{ minWidth: images.length * 60 }}>
              {images.map((image, index) => {
                // Only render items in the visible range for large sets
                if (images.length > 50 && (index < renderStart || index > renderEnd)) {
                  return <div key={image.id} className="flex-shrink-0" style={{ width: 50, height: 56 }} />;
                }

                const thumbSrc = thumbnailMap?.get(image.id) || image.src;

                return (
                  <div
                    key={image.id}
                    className={cn(
                      "relative group flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200",
                      index === currentImageIndex
                        ? "border-primary ring-2 ring-primary/30 scale-105"
                        : "border-transparent hover:border-muted-foreground/50"
                    )}
                    onClick={() => onSelectImage(index)}
                  >
                    <img
                      src={thumbSrc}
                      alt={`Image ${index + 1}`}
                      className="h-14 w-auto object-cover"
                      style={{ minWidth: 50, maxWidth: 100 }}
                      loading="lazy"
                    />
                    
                    {/* Image number badge */}
                    <div className="absolute bottom-0.5 left-0.5 bg-background/80 text-foreground text-[10px] font-medium px-1 rounded">
                      {index + 1}
                    </div>
                    
                    {/* Elements count badge */}
                    {image.elements.length > 0 && (
                      <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] font-medium px-1 rounded">
                        {image.elements.length}
                      </div>
                    )}
                    
                    {/* Remove button */}
                    {onRemoveImage && (
                      <button
                        className="absolute top-0.5 left-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(index);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export const FilmstripPreview = memo(FilmstripPreviewInner);
