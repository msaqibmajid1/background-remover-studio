/**
 * Utility functions for image path resolution and validation
 */

export interface MissingImage {
  id: string;
  originalSrc: string;
  originalFilename: string;
  thumbnail?: string;
  elementType?: string;
}

export interface ImagePathMapping {
  [originalPath: string]: string;
}

/**
 * Extract filename from a path or URL
 */
export const extractFilename = (path: string): string => {
  if (!path) return '';
  
  // Handle data URLs - return empty since no filename
  if (path.startsWith('data:')) {
    return '';
  }
  
  // Handle blob URLs - return empty since no filename
  if (path.startsWith('blob:')) {
    return '';
  }
  
  // Handle regular paths/URLs
  try {
    const url = new URL(path, window.location.origin);
    const pathname = url.pathname;
    return pathname.split('/').pop() || '';
  } catch {
    // Fallback for simple paths
    return path.split('/').pop()?.split('\\').pop() || '';
  }
};

/**
 * Validate if an image URL is accessible
 */
export const validateImageUrl = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Data URLs are always valid
    if (url.startsWith('data:')) {
      resolve(true);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    // Set a timeout for slow connections
    const timeout = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
};

/**
 * Validate multiple image URLs and return missing ones
 */
export const findMissingImages = async (
  imageSources: { id: string; src: string; filename?: string; thumbnail?: string; elementType?: string }[]
): Promise<MissingImage[]> => {
  const results = await Promise.all(
    imageSources.map(async (source) => {
      const isValid = await validateImageUrl(source.src);
      return {
        ...source,
        isValid,
      };
    })
  );
  
  return results
    .filter((r) => !r.isValid)
    .map((r) => ({
      id: r.id,
      originalSrc: r.src,
      originalFilename: r.filename || extractFilename(r.src),
      thumbnail: r.thumbnail,
      elementType: r.elementType,
    }));
};

/**
 * Auto-match missing images to available files by filename
 */
export const matchImagesByFilename = (
  missingImages: MissingImage[],
  availableFiles: File[]
): Map<string, File> => {
  const matches = new Map<string, File>();
  
  for (const missing of missingImages) {
    const filename = missing.originalFilename.toLowerCase();
    if (!filename) continue;
    
    // Try exact match first
    const exactMatch = availableFiles.find(
      (f) => f.name.toLowerCase() === filename
    );
    if (exactMatch) {
      matches.set(missing.id, exactMatch);
      continue;
    }
    
    // Try partial match (without extension)
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const partialMatch = availableFiles.find((f) => {
      const availableWithoutExt = f.name.toLowerCase().replace(/\.[^/.]+$/, '');
      return availableWithoutExt === filenameWithoutExt;
    });
    if (partialMatch) {
      matches.set(missing.id, partialMatch);
    }
  }
  
  return matches;
};

/**
 * Convert File to data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Create a placeholder image data URL
 */
export const createPlaceholderImage = (width = 200, height = 200): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Fill with a pattern
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Add diagonal lines
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    for (let i = -height; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }
    
    // Add text
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Missing Image', width / 2, height / 2);
  }
  
  return canvas.toDataURL('image/png');
};

/**
 * Generate a small thumbnail from an image
 */
export const generateThumbnail = async (
  src: string,
  maxSize = 60
): Promise<string | undefined> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      } else {
        resolve(undefined);
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
};
