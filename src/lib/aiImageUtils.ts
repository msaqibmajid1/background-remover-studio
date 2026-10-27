import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

// Upscaling using ESRGAN model
export const upscaleImage = async (
  imageElement: HTMLImageElement,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  try {
    console.log('Starting image upscaling...');
    onProgress?.(10);
    
    const upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64', {
      device: 'webgpu',
    });
    
    onProgress?.(30);
    
    // Convert image to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Limit input size to prevent memory issues
    const maxDim = 512;
    let width = imageElement.naturalWidth;
    let height = imageElement.naturalHeight;
    
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    onProgress?.(50);
    
    console.log('Processing with upscaling model...');
    const result = await upscaler(imageData);
    onProgress?.(80);
    
    // Convert result to blob
    if (result && typeof result === 'object' && 'toDataURL' in result) {
      const dataUrl = (result as any).toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      onProgress?.(100);
      return blob;
    }
    
    // If result is a RawImage, convert it
    if (result && typeof result === 'object' && 'data' in result) {
      const rawImage = result as any;
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = rawImage.width;
      outputCanvas.height = rawImage.height;
      const outputCtx = outputCanvas.getContext('2d');
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      const imgData = outputCtx.createImageData(rawImage.width, rawImage.height);
      for (let i = 0; i < rawImage.data.length; i++) {
        imgData.data[i] = rawImage.data[i];
      }
      outputCtx.putImageData(imgData, 0, 0);
      
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob((blob) => {
          if (blob) {
            onProgress?.(100);
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png', 1.0);
      });
    }
    
    throw new Error('Invalid upscaling result');
  } catch (error) {
    console.error('Error upscaling image:', error);
    throw error;
  }
};

// Simple 2x upscale using canvas (fast, no AI)
export const upscaleImageSimple = async (
  imageElement: HTMLImageElement,
  scale: number = 2
): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = imageElement.naturalWidth * scale;
  canvas.height = imageElement.naturalHeight * scale;
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/png', 1.0);
  });
};

// Image optimization/compression
export const optimizeImage = async (
  imageElement: HTMLImageElement,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    preserveTransparency?: boolean;
  } = {}
): Promise<{ blob: Blob; originalSize: number; optimizedSize: number }> => {
  const {
    maxWidth = imageElement.naturalWidth,
    maxHeight = imageElement.naturalHeight,
    quality = 0.85,
    format = 'webp',
    preserveTransparency = true,
  } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  let width = imageElement.naturalWidth;
  let height = imageElement.naturalHeight;
  
  // Calculate new dimensions while preserving aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Use high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Fill with white background for JPEG (no transparency support)
  if (format === 'jpeg' && !preserveTransparency) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.drawImage(imageElement, 0, 0, width, height);
  
  // Get original size estimate
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = imageElement.naturalWidth;
  originalCanvas.height = imageElement.naturalHeight;
  const originalCtx = originalCanvas.getContext('2d');
  if (originalCtx) {
    originalCtx.drawImage(imageElement, 0, 0);
  }
  
  const originalBlob = await new Promise<Blob>((resolve) => {
    originalCanvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
  });
  
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({
            blob,
            originalSize: originalBlob.size,
            optimizedSize: blob.size,
          });
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      quality
    );
  });
};

// Batch optimize multiple images
export const batchOptimizeImages = async (
  images: { file: File; element: HTMLImageElement }[],
  options: Parameters<typeof optimizeImage>[1],
  onProgress?: (current: number, total: number) => void
): Promise<{ file: File; originalSize: number; optimizedSize: number; blob: Blob }[]> => {
  const results: { file: File; originalSize: number; optimizedSize: number; blob: Blob }[] = [];
  
  for (let i = 0; i < images.length; i++) {
    const { file, element } = images[i];
    onProgress?.(i + 1, images.length);
    
    const result = await optimizeImage(element, options);
    results.push({
      file,
      ...result,
    });
  }
  
  return results;
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
