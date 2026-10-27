import { CanvasElement } from "@/types/editor";

/**
 * Get all elements in the same group as the target element
 */
export function getGroupedElements(
  elements: CanvasElement[],
  targetElement: CanvasElement
): CanvasElement[] {
  if (!targetElement.groupId) {
    return [targetElement];
  }
  
  return elements.filter(el => el.groupId === targetElement.groupId);
}

/**
 * Calculate the bounding box of multiple elements
 */
export function getGroupBoundingBox(elements: CanvasElement[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  const minX = Math.min(...elements.map(el => el.x));
  const minY = Math.min(...elements.map(el => el.y));
  const maxX = Math.max(...elements.map(el => el.x + el.width));
  const maxY = Math.max(...elements.map(el => el.y + el.height));
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Move all elements in a group by a delta
 */
export function moveGroupedElements(
  elements: CanvasElement[],
  groupId: string | undefined,
  dx: number,
  dy: number,
  canvasWidth: number,
  canvasHeight: number
): CanvasElement[] {
  if (!groupId) return elements;
  
  return elements.map(el => {
    if (el.groupId === groupId) {
      const newX = Math.max(0, Math.min(el.x + dx, canvasWidth - el.width));
      const newY = Math.max(0, Math.min(el.y + dy, canvasHeight - el.height));
      return { ...el, x: newX, y: newY };
    }
    return el;
  });
}

/**
 * Scale all elements in a group proportionally
 */
export function scaleGroupedElements(
  elements: CanvasElement[],
  groupId: string | undefined,
  scaleFactor: number,
  centerX: number,
  centerY: number
): CanvasElement[] {
  if (!groupId) return elements;
  
  return elements.map(el => {
    if (el.groupId === groupId) {
      // Calculate element's center relative to group center
      const elCenterX = el.x + el.width / 2;
      const elCenterY = el.y + el.height / 2;
      
      // Scale position relative to group center
      const newCenterX = centerX + (elCenterX - centerX) * scaleFactor;
      const newCenterY = centerY + (elCenterY - centerY) * scaleFactor;
      
      // Scale dimensions
      const newWidth = el.width * scaleFactor;
      const newHeight = el.height * scaleFactor;
      
      return {
        ...el,
        x: newCenterX - newWidth / 2,
        y: newCenterY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
    }
    return el;
  });
}
