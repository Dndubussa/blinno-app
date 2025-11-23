/**
 * Optimizes an image by resizing and compressing it
 * @param file - The image file to optimize
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Optimized image blob
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Optimizes an avatar image (smaller dimensions)
 */
export async function optimizeAvatar(file: File): Promise<Blob> {
  return optimizeImage(file, 512, 512, 0.9);
}
