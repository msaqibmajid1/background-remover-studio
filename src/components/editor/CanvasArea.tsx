import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { EditorImage, CanvasElement } from "@/types/editor";
import { renderImageToCanvas, renderImageToCanvasSync } from "@/lib/canvasUtils";
import { loadGoogleFont } from "@/hooks/useGoogleFonts";
import { ZoomControls } from "./ZoomControls";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasRulers, Guide } from "./CanvasRulers";
import { calculateSmartGuides, drawSmartGuides, SmartGuide } from "./SmartGuides";

// 60fps throttle using requestAnimationFrame for smooth drag updates
const createRAFThrottle = <T extends (...args: unknown[]) => void>() => {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  return (fn: T) => (...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs);
        }
        rafId = null;
      });
    }
  };
};

interface CanvasAreaProps {
  currentImage: EditorImage | null;
  images?: EditorImage[];
  currentImageIndex?: number;
  selectedElement: CanvasElement | null;
  selectedElements: string[];
  onSelectElement: (element: CanvasElement | null, shiftKey?: boolean) => void;
  onUpdateElement: (element: CanvasElement) => void;
  onUpdateElementPreview?: (element: CanvasElement) => void; // No undo snapshot
  onDeleteElement: () => void;
  loadedImages: Map<string, HTMLImageElement>;
  onUploadImages?: (files: FileList) => void;
}

// Cache for main background images to prevent reloading
const mainImageCache = new Map<string, HTMLImageElement>();
const MAX_IMAGE_CACHE_SIZE = 20;

// Lazy loading tracker - only load images for current image
const activeImageIndex = { current: -1 };

export const CanvasArea = React.memo(({
  currentImage,
  images = [],
  currentImageIndex = 0,
  selectedElement,
  selectedElements,
  onSelectElement,
  onUpdateElement,
  onUpdateElementPreview,
  onDeleteElement,
  loadedImages,
  onUploadImages,
}: CanvasAreaProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const renderRequestRef = useRef<number | null>(null);
  const lastRenderSrcRef = useRef<string>("");
  const dragStartElementRef = useRef<CanvasElement | null>(null); // Store element state at drag start
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>("");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelectStart, setDragSelectStart] = useState({ x: 0, y: 0 });
  const [dragSelectEnd, setDragSelectEnd] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [cursorStyle, setCursorStyle] = useState<string>("crosshair");

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [viewportOffset, setViewportOffset] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Grid and snap state
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Rulers and guides state
  const [showRulers, setShowRulers] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);

  // Smart guides state
  const [smartGuides, setSmartGuides] = useState<SmartGuide[]>([]);
  const [enableSmartGuides, setEnableSmartGuides] = useState(true);

  // 60fps throttled update function for smooth dragging
  const throttledUpdateRef = useRef(createRAFThrottle<(element: CanvasElement) => void>());
  const throttledUpdate = useMemo(() => {
    const updateFn = onUpdateElementPreview || onUpdateElement;
    return throttledUpdateRef.current(updateFn);
  }, [onUpdateElementPreview, onUpdateElement]);

  // Update active image index for lazy loading
  useEffect(() => {
    activeImageIndex.current = currentImageIndex;
  }, [currentImageIndex]);

  // Update container size for minimap
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Snap value to grid
  const snapValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleZoomFit = useCallback(() => {
    if (!currentImage || !containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 100;
    const containerHeight = container.clientHeight - 100;
    const scaleX = containerWidth / currentImage.canvasSize.width;
    const scaleY = containerHeight / currentImage.canvasSize.height;
    setZoom(Math.min(scaleX, scaleY, 1));
  }, [currentImage]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          handleZoomReset();
        } else if (e.key === "1") {
          e.preventDefault();
          handleZoomFit();
        } else if (e.key === "g") {
          e.preventDefault();
          setShowGrid(prev => !prev);
        } else if (e.key === "r") {
          e.preventDefault();
          setShowRulers(prev => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset, handleZoomFit]);

  // Guide handlers
  const handleAddGuide = useCallback((guide: Guide) => {
    setGuides(prev => [...prev, guide]);
  }, []);

  const handleRemoveGuide = useCallback((id: string) => {
    setGuides(prev => prev.filter(g => g.id !== id));
  }, []);

  const handleUpdateGuide = useCallback((id: string, position: number) => {
    setGuides(prev => prev.map(g => g.id === id ? { ...g, position } : g));
  }, []);

  // Compute which templateCodes are shared across multiple images (for visual indicator)
  const linkedTemplateCodes = useMemo(() => {
    if (images.length <= 1) return new Set<string>();
    const codeToImageIndices = new Map<string, Set<number>>();
    images.forEach((img, imgIdx) => {
      img.elements.forEach(el => {
        if (el.templateCode) {
          if (!codeToImageIndices.has(el.templateCode)) {
            codeToImageIndices.set(el.templateCode, new Set());
          }
          codeToImageIndices.get(el.templateCode)!.add(imgIdx);
        }
      });
    });
    const linked = new Set<string>();
    codeToImageIndices.forEach((indices, code) => {
      if (indices.size > 1) linked.add(code);
    });
    return linked;
  }, [images]);

  // Draw linked indicator badge on elements that share templateCode across images
  const drawLinkedBadge = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
    ctx.save();
    const badgeWidth = 20;
    const badgeHeight = 16;
    // Position at bottom-right of element
    const badgeX = element.x + element.width - badgeWidth - 2;
    const badgeY = element.y + element.height - badgeHeight - 2;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.85)'; // indigo
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 3);
    ctx.fill();

    // Draw a simple chain-link icon using lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const cx = badgeX + badgeWidth / 2;
    const cy = badgeY + badgeHeight / 2;
    // Left link
    ctx.beginPath();
    ctx.ellipse(cx - 3, cy, 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Right link
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy, 3, 4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, []);

  // Memoized render function - use sync render during drag for smooth performance
  const renderCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    image: EditorImage,
    selected: CanvasElement | null,
    selectedIds: string[],
    dragSelecting: boolean,
    currentSmartGuides: SmartGuide[] = [],
    useSyncRender: boolean = false
  ) => {
    // Use synchronous render during drag for smooth movement
    if (useSyncRender) {
      renderImageToCanvasSync(image, ctx, img, loadedImages);
    } else {
      // Full async render when not dragging (loads any missing images)
      renderImageToCanvas(image, ctx, img, loadedImages, false);
    }
    
    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, image.canvasSize.width, image.canvasSize.height);
    }

    // Draw guides if enabled
    if (showGuides && guides.length > 0) {
      drawGuides(ctx, image.canvasSize.width, image.canvasSize.height);
    }

    // Draw smart guides during dragging
    if (currentSmartGuides.length > 0) {
      drawSmartGuides(ctx, currentSmartGuides);
    }

    // Draw linked badges on elements that share templateCode across images
    if (linkedTemplateCodes.size > 0) {
      image.elements.forEach(el => {
        if (el.templateCode && linkedTemplateCodes.has(el.templateCode)) {
          drawLinkedBadge(ctx, el);
        }
      });
    }
    
    // Draw selection boxes for all selected elements AFTER all elements are rendered
    // Sort selected elements by zIndex to draw selection boxes in correct order
    const sortedSelectedElements = selectedIds
      .map(id => image.elements.find(e => e.id === id))
      .filter((el): el is CanvasElement => el !== undefined && !el.locked)
      .sort((a, b) => a.zIndex - b.zIndex);
    
    if (sortedSelectedElements.length > 0) {
      sortedSelectedElements.forEach(el => {
        const isMulti = el.id !== selected?.id;
        drawSelectionBox(ctx, el, isMulti);
      });
    } else if (selected && !selected.locked) {
      // Draw selection box if element is selected
      drawSelectionBox(ctx, selected, false);
    }
    
    // Draw drag selection rectangle
    if (dragSelecting) {
      drawDragSelectionBox(ctx, dragSelectStart, dragSelectEnd);
    }
  }, [loadedImages, dragSelectStart, dragSelectEnd, showGrid, showGuides, guides, gridSize, linkedTemplateCodes, drawLinkedBadge]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = "rgba(128, 128, 128, 0.2)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawGuides = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 191, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    guides.forEach(guide => {
      ctx.beginPath();
      if (guide.orientation === "horizontal") {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(width, guide.position);
      } else {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, height);
      }
      ctx.stroke();
    });

    ctx.setLineDash([]);
    ctx.restore();
  };

  useEffect(() => {
    if (!currentImage || !canvasRef.current) return;

    // Preload fonts for all text elements (only when not dragging to avoid overhead)
    if (!isDragging && !isResizing) {
      currentImage.elements
        .filter((el): el is Extract<CanvasElement, { type: "text" }> => el.type === "text")
        .forEach(el => loadGoogleFont(el.fontFamily));
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cancel any pending render
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }

    // Use sync render during drag/resize for smooth performance
    const useSyncRender = isDragging || isResizing;

    // Check if we have the main image cached
    const cachedImg = mainImageCache.get(currentImage.src);
    
    if (cachedImg && cachedImg.complete) {
      // Use cached image - render immediately with requestAnimationFrame for batching
      imageRef.current = cachedImg;
      renderRequestRef.current = requestAnimationFrame(() => {
        renderCanvas(ctx, cachedImg, currentImage, selectedElement, selectedElements, isDragSelecting, smartGuides, useSyncRender);
      });
    } else if (lastRenderSrcRef.current === currentImage.src && imageRef.current?.complete) {
      // Same image source, reuse existing image ref
      renderRequestRef.current = requestAnimationFrame(() => {
        renderCanvas(ctx, imageRef.current!, currentImage, selectedElement, selectedElements, isDragSelecting, smartGuides, useSyncRender);
      });
    } else {
      // Need to load new image
      const img = new Image();
      img.onload = () => {
        // Cap cache size - evict oldest entries
        if (mainImageCache.size >= MAX_IMAGE_CACHE_SIZE) {
          const firstKey = mainImageCache.keys().next().value;
          if (firstKey) mainImageCache.delete(firstKey);
        }
        // Cache the loaded image
        mainImageCache.set(currentImage.src, img);
        imageRef.current = img;
        lastRenderSrcRef.current = currentImage.src;
        
        renderRequestRef.current = requestAnimationFrame(() => {
          renderCanvas(ctx, img, currentImage, selectedElement, selectedElements, isDragSelecting, smartGuides, useSyncRender);
        });
      };
      img.onerror = () => {
        console.error("Failed to load main image:", currentImage.src);
      };
      img.src = currentImage.src;
    }

    // Cleanup
    return () => {
      if (renderRequestRef.current) {
        cancelAnimationFrame(renderRequestRef.current);
      }
    };
  }, [currentImage, selectedElement, loadedImages, isDragSelecting, dragSelectStart, dragSelectEnd, selectedElements, renderCanvas, showGrid, showGuides, guides, smartGuides, isDragging, isResizing]);

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    element: CanvasElement,
    isMultiSelect: boolean = false
  ) => {
    ctx.save();
    
    // Check if this is a text element with autoFitText enabled
    const isAutoFitText = element.type === "text" && (element as import("@/types/editor").TextElement).autoFitText;
    const isDimensionsLocked = element.type === "text" && (element as import("@/types/editor").TextElement).dimensionsLocked;
    
    // Use different colors: green for auto-fit, orange for locked dimensions, blue for normal
    let strokeColor = isMultiSelect ? '#60a5fa' : '#3b82f6';
    let handleColor = isMultiSelect ? '#60a5fa' : '#3b82f6';
    
    if (isAutoFitText) {
      strokeColor = '#10b981'; // Green for auto-fit
      handleColor = '#10b981';
    } else if (isDimensionsLocked) {
      strokeColor = '#f59e0b'; // Orange for locked dimensions
      handleColor = '#f59e0b';
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(element.x, element.y, element.width, element.height);
    ctx.setLineDash([]);

    // Draw resize handles
    const handleSize = 8;
    ctx.fillStyle = handleColor;
    
    // Corner handles
    ctx.fillRect(element.x - handleSize / 2, element.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(element.x + element.width - handleSize / 2, element.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(element.x - handleSize / 2, element.y + element.height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(element.x + element.width - handleSize / 2, element.y + element.height - handleSize / 2, handleSize, handleSize);
    
    // Edge handles (top, bottom, left, right)
    ctx.fillRect(element.x + element.width / 2 - handleSize / 2, element.y - handleSize / 2, handleSize, handleSize); // top
    ctx.fillRect(element.x + element.width / 2 - handleSize / 2, element.y + element.height - handleSize / 2, handleSize, handleSize); // bottom
    ctx.fillRect(element.x - handleSize / 2, element.y + element.height / 2 - handleSize / 2, handleSize, handleSize); // left
    ctx.fillRect(element.x + element.width - handleSize / 2, element.y + element.height / 2 - handleSize / 2, handleSize, handleSize); // right
    
    // Draw auto-fit indicator badge (top-left)
    if (isAutoFitText) {
      const badgeWidth = 36;
      const badgeHeight = 16;
      const badgeX = element.x;
      const badgeY = element.y - badgeHeight - 4;
      
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 3);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AUTO', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }
    
    // Draw lock indicator badge (top-left, offset if auto-fit is also shown)
    if (isDimensionsLocked) {
      const badgeWidth = 24;
      const badgeHeight = 16;
      const badgeX = isAutoFitText ? element.x + 40 : element.x;
      const badgeY = element.y - badgeHeight - 4;
      
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 3);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }
    
    // Draw delete button (top-right)
    const deleteSize = 20;
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(element.x + element.width - deleteSize, element.y - deleteSize, deleteSize, deleteSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("×", element.x + element.width - deleteSize / 2, element.y - deleteSize / 2);
    
    ctx.restore();
  };

  const drawDragSelectionBox = (
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number } = dragSelectStart,
    end: { x: number; y: number } = dragSelectEnd
  ) => {
    ctx.save();
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    
    // Draw semi-transparent fill
    ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
    ctx.fillRect(x, y, width, height);
    
    // Draw border
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
    ctx.restore();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentImage || !canvasRef.current) return;

    const { x, y } = getCanvasCoordinates(e);

    // Check if clicked on any element (reverse order to prioritize top elements)
    // Filter out locked and hidden elements
    const clickedElement = [...currentImage.elements]
      .filter(el => !el.locked && el.visible !== false)
      .reverse()
      .find(
        (el) =>
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
      );

    // If clicked element is part of a group and not shift-clicking, select all grouped elements
    if (clickedElement?.groupId && !e.shiftKey) {
      onSelectElement(clickedElement, false);
      // Auto-select all grouped elements
      const groupedElements = currentImage.elements.filter(el => el.groupId === clickedElement.groupId && !el.locked);
      groupedElements.forEach((el, index) => {
        if (index > 0) { // Skip first as it's already selected
          onSelectElement(el, true);
        }
      });
    } else {
      onSelectElement(clickedElement || null, e.shiftKey);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !currentImage) return;

    const { x, y } = getCanvasCoordinates(e);

    // Check if clicking on any unlocked element
    const clickedElement = [...currentImage.elements]
      .filter(el => !el.locked && el.visible !== false)
      .reverse()
      .find(
        (el) =>
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
      );

    // If no element clicked and no selected element, start drag selection
    if (!clickedElement && !selectedElement) {
      setIsDragSelecting(true);
      setDragSelectStart({ x, y });
      setDragSelectEnd({ x, y });
      return;
    }

    // Use clickedElement if available, otherwise use selectedElement
    // This allows immediate dragging when clicking on an element
    const elementToInteract = clickedElement || selectedElement;
    
    if (!elementToInteract || elementToInteract.locked) return;

    const handleSize = 8;
    const el = elementToInteract;

    // Check delete button (only for already selected element)
    if (selectedElement && el.id === selectedElement.id) {
      const deleteSize = 20;
      if (
        x >= el.x + el.width - deleteSize &&
        x <= el.x + el.width &&
        y >= el.y - deleteSize &&
        y <= el.y
      ) {
        onDeleteElement();
        return;
      }

      // Check resize handles (skip if dimensions are locked for text elements)
      const isDimensionsLocked = el.type === "text" && (el as import("@/types/editor").TextElement).dimensionsLocked;
      
      const handles = [
        { name: "nw", x: el.x, y: el.y },
        { name: "ne", x: el.x + el.width, y: el.y },
        { name: "sw", x: el.x, y: el.y + el.height },
        { name: "se", x: el.x + el.width, y: el.y + el.height },
        { name: "n", x: el.x + el.width / 2, y: el.y },
        { name: "s", x: el.x + el.width / 2, y: el.y + el.height },
        { name: "w", x: el.x, y: el.y + el.height / 2 },
        { name: "e", x: el.x + el.width, y: el.y + el.height / 2 },
      ];

      for (const handle of handles) {
        if (
          x >= handle.x - handleSize &&
          x <= handle.x + handleSize &&
          y >= handle.y - handleSize &&
          y <= handle.y + handleSize
        ) {
          // Block resize if dimensions are locked
          if (isDimensionsLocked) {
            return; // Don't start resizing
          }
          setIsResizing(true);
          setResizeHandle(handle.name);
          setDragStart({ x, y });
          setElementStart({ x: el.x, y: el.y, width: el.width, height: el.height });
          dragStartElementRef.current = { ...el }; // Store full element at start
          return;
        }
      }
    }

    // Check if mouse is on element for dragging (works for any clicked element)
    if (
      x >= el.x &&
      x <= el.x + el.width &&
      y >= el.y &&
      y <= el.y + el.height
    ) {
      // Select the element if it's not already selected
      if (!selectedElement || selectedElement.id !== el.id) {
        onSelectElement(el, e.shiftKey);
      }
      setIsDragging(true);
      setDragStart({ x: x - el.x, y: y - el.y });
      dragStartElementRef.current = { ...el }; // Store full element at start
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const { x, y } = getCanvasCoordinates(e);

    // Handle drag selection
    if (isDragSelecting) {
      setDragSelectEnd({ x, y });
      return;
    }

    // Update cursor based on hover position
    if (selectedElement && !selectedElement.locked && !isResizing && !isDragging) {
      const handleSize = 8;
      const el = selectedElement;
      const isDimensionsLocked = el.type === "text" && (el as import("@/types/editor").TextElement).dimensionsLocked;

      // Check resize handles for cursor
      const handles = [
        { name: "nw", x: el.x, y: el.y, cursor: isDimensionsLocked ? "not-allowed" : "nwse-resize" },
        { name: "ne", x: el.x + el.width, y: el.y, cursor: isDimensionsLocked ? "not-allowed" : "nesw-resize" },
        { name: "sw", x: el.x, y: el.y + el.height, cursor: isDimensionsLocked ? "not-allowed" : "nesw-resize" },
        { name: "se", x: el.x + el.width, y: el.y + el.height, cursor: isDimensionsLocked ? "not-allowed" : "nwse-resize" },
        { name: "n", x: el.x + el.width / 2, y: el.y, cursor: isDimensionsLocked ? "not-allowed" : "ns-resize" },
        { name: "s", x: el.x + el.width / 2, y: el.y + el.height, cursor: isDimensionsLocked ? "not-allowed" : "ns-resize" },
        { name: "w", x: el.x, y: el.y + el.height / 2, cursor: isDimensionsLocked ? "not-allowed" : "ew-resize" },
        { name: "e", x: el.x + el.width, y: el.y + el.height / 2, cursor: isDimensionsLocked ? "not-allowed" : "ew-resize" },
      ];

      let hoveredHandle = false;
      for (const handle of handles) {
        if (
          x >= handle.x - handleSize &&
          x <= handle.x + handleSize &&
          y >= handle.y - handleSize &&
          y <= handle.y + handleSize
        ) {
          setCursorStyle(handle.cursor);
          hoveredHandle = true;
          break;
        }
      }

      if (!hoveredHandle) {
        // Check if hovering over element body
        if (
          x >= el.x &&
          x <= el.x + el.width &&
          y >= el.y &&
          y <= el.y + el.height
        ) {
          setCursorStyle("move");
        } else {
          setCursorStyle("crosshair");
        }
      }
    } else if (!selectedElement && !dragStartElementRef.current) {
      setCursorStyle("crosshair");
    }

    // Use dragStartElementRef for dragging since selectedElement may not be updated yet
    const draggingElement = dragStartElementRef.current || selectedElement;
    if (!draggingElement || draggingElement.locked) return;

    if (isResizing) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      let newX = elementStart.x;
      let newY = elementStart.y;
      let newWidth = elementStart.width;
      let newHeight = elementStart.height;

      const maintainAspect = draggingElement.type === "logo" || draggingElement.type === "watermark" || draggingElement.type === "image";
      const aspectRatio = elementStart.width / elementStart.height;

      if (resizeHandle === "se") {
        newWidth = Math.max(20, elementStart.width + dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : Math.max(20, elementStart.height + dy);
      } else if (resizeHandle === "sw") {
        newWidth = Math.max(20, elementStart.width - dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : Math.max(20, elementStart.height + dy);
        newX = elementStart.x + dx;
      } else if (resizeHandle === "ne") {
        newWidth = Math.max(20, elementStart.width + dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : Math.max(20, elementStart.height - dy);
        newY = elementStart.y + dy;
      } else if (resizeHandle === "nw") {
        newWidth = Math.max(20, elementStart.width - dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : Math.max(20, elementStart.height - dy);
        newX = elementStart.x + dx;
        newY = elementStart.y + dy;
      } else if (resizeHandle === "n") {
        newHeight = Math.max(20, elementStart.height - dy);
        newWidth = maintainAspect ? newHeight * aspectRatio : newWidth;
        newY = elementStart.y + dy;
      } else if (resizeHandle === "s") {
        newHeight = Math.max(20, elementStart.height + dy);
        newWidth = maintainAspect ? newHeight * aspectRatio : newWidth;
      } else if (resizeHandle === "w") {
        newWidth = Math.max(20, elementStart.width - dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : newHeight;
        newX = elementStart.x + dx;
      } else if (resizeHandle === "e") {
        newWidth = Math.max(20, elementStart.width + dx);
        newHeight = maintainAspect ? newWidth / aspectRatio : newHeight;
      }

      // Apply snap to grid
      newX = snapValue(newX);
      newY = snapValue(newY);
      newWidth = snapValue(newWidth);
      newHeight = snapValue(newHeight);

      // Use 60fps throttled update during resize for smooth performance
      throttledUpdate({
        ...draggingElement,
        x: Math.max(0, Math.min(newX, canvas.width - newWidth)),
        y: Math.max(0, Math.min(newY, canvas.height - newHeight)),
        width: Math.min(newWidth, canvas.width - newX),
        height: Math.min(newHeight, canvas.height - newY),
      });
    } else if (isDragging) {
      if (!currentImage) return;
      
      let newX = snapValue(x - dragStart.x);
      let newY = snapValue(y - dragStart.y);
      
      // Calculate smart guides for element alignment
      if (enableSmartGuides && !snapToGrid) {
        const tempElement = { ...draggingElement, x: newX, y: newY };
        const { guides: newGuides, snappedPosition } = calculateSmartGuides(
          tempElement,
          currentImage.elements,
          canvas.width,
          canvas.height
        );
        setSmartGuides(newGuides);
        newX = snappedPosition.x;
        newY = snappedPosition.y;
      }
      
      // Check if the selected element is part of a group
      if (draggingElement.groupId) {
        // Calculate delta from original position
        const dx = newX - draggingElement.x;
        const dy = newY - draggingElement.y;
        
        // Move all elements in the group using 60fps throttled updates
        const updatedElements = currentImage.elements.map(el => {
          if (el.groupId === draggingElement.groupId && !el.locked) {
            const groupNewX = snapValue(Math.max(0, Math.min(el.x + dx, canvas.width - el.width)));
            const groupNewY = snapValue(Math.max(0, Math.min(el.y + dy, canvas.height - el.height)));
            return { ...el, x: groupNewX, y: groupNewY };
          }
          return el;
        });
        
        // Find the updated selected element and update all grouped elements
        updatedElements.forEach(el => {
          if (el.groupId === draggingElement.groupId) {
            throttledUpdate(el);
          }
        });
      } else {
        // Single element movement using 60fps throttled update
        throttledUpdate({
          ...draggingElement,
          x: Math.max(0, Math.min(newX, canvas.width - draggingElement.width)),
          y: Math.max(0, Math.min(newY, canvas.height - draggingElement.height)),
        });
      }
    }
  };

  const handleMouseUp = () => {
    // Clear smart guides
    setSmartGuides([]);
    
    // Commit the final position with undo snapshot if we were dragging/resizing
    if ((isDragging || isResizing) && dragStartElementRef.current && currentImage) {
      const startEl = dragStartElementRef.current;
      
      // Get the latest element state from currentImage.elements
      const latestElement = currentImage.elements.find(el => el.id === startEl.id);
      
      if (latestElement) {
        // Check if position actually changed
        const positionChanged = 
          startEl.x !== latestElement.x || 
          startEl.y !== latestElement.y ||
          startEl.width !== latestElement.width ||
          startEl.height !== latestElement.height;
        
        if (positionChanged) {
          // Commit with undo snapshot by calling onUpdateElement
          onUpdateElement(latestElement);
        }
      }
      dragStartElementRef.current = null;
    }
    
    // Handle drag selection completion
    if (isDragSelecting && currentImage) {
      const selectionX = Math.min(dragSelectStart.x, dragSelectEnd.x);
      const selectionY = Math.min(dragSelectStart.y, dragSelectEnd.y);
      const selectionWidth = Math.abs(dragSelectEnd.x - dragSelectStart.x);
      const selectionHeight = Math.abs(dragSelectEnd.y - dragSelectStart.y);

      // Find all unlocked elements that intersect with selection rectangle
      const selectedIds = currentImage.elements
        .filter((el) => {
          if (el.locked || el.visible === false) return false;
          // Check if element intersects with selection rectangle
          return !(
            el.x + el.width < selectionX ||
            el.x > selectionX + selectionWidth ||
            el.y + el.height < selectionY ||
            el.y > selectionY + selectionHeight
          );
        })
        .map((el) => el.id);

      // Select the first element as primary and others as multi-select
      if (selectedIds.length > 0) {
        const firstElement = currentImage.elements.find(el => el.id === selectedIds[0]);
        onSelectElement(firstElement || null, false);
        
        // Add other elements to multi-select
        selectedIds.slice(1).forEach(id => {
          const el = currentImage.elements.find(e => e.id === id);
          if (el) onSelectElement(el, true);
        });
      }

      setIsDragSelecting(false);
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle("");
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && onUploadImages) {
      // Filter to only image files
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      
      if (imageFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        onUploadImages(dataTransfer.files);
      }
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.25, Math.min(4, prev + delta)));
    }
  }, []);

  if (!currentImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-canvas">
        <div className="text-center space-y-4">
          <div className="text-4xl">📷</div>
          <div>
            <p className="text-lg font-medium text-foreground">No Image Loaded</p>
            <p className="text-sm text-muted-foreground">Upload images to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-canvas"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Status Bar */}
      <div className="h-10 border-b border-panel-border bg-panel px-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {currentImage.file.name}
        </span>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            {currentImage.canvasSize.width} × {currentImage.canvasSize.height}
          </span>
          <span className="text-muted-foreground">
            {currentImage.elements.length} element(s)
          </span>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex items-center justify-center relative"
        onWheel={handleWheel}
      >
        {isDragOver && (
          <div className="absolute inset-0 bg-primary/10 border-4 border-dashed border-primary flex items-center justify-center z-50">
            <div className="bg-background/95 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📁</div>
              <p className="text-xl font-semibold text-foreground">Drop Images Here</p>
              <p className="text-muted-foreground mt-2">Release to upload images</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2 z-30">
          <CanvasToolbar
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(prev => !prev)}
            gridSize={gridSize}
            onGridSizeChange={setGridSize}
            snapToGrid={snapToGrid}
            onToggleSnapToGrid={() => setSnapToGrid(prev => !prev)}
            showRulers={showRulers}
            onToggleRulers={() => setShowRulers(prev => !prev)}
            showGuides={showGuides}
            onToggleGuides={() => setShowGuides(prev => !prev)}
          />
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 z-30">
          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomReset={handleZoomReset}
            onZoomFit={handleZoomFit}
          />
        </div>

        {/* Canvas with rulers */}
        <div className="relative" style={{ 
          paddingLeft: showRulers ? 20 : 0, 
          paddingTop: showRulers ? 20 : 0 
        }}>
          {showRulers && (
            <CanvasRulers
              width={currentImage.canvasSize.width}
              height={currentImage.canvasSize.height}
              zoom={zoom}
              guides={guides}
              onAddGuide={handleAddGuide}
              onRemoveGuide={handleRemoveGuide}
              onUpdateGuide={handleUpdateGuide}
              showRulers={showRulers}
            />
          )}

          <div 
            className="shadow-xl"
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-full border border-border"
              style={{ imageRendering: "crisp-edges", cursor: cursorStyle }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
