/**
 * Downscales an image represented as a data URL to fit within the specified dimensions.
 * Returns a promise that resolves to the downscaled image as a data URL.
 */
export function downscaleImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      // Using JPEG with 0.7 quality to further reduce file size
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = dataUrl;
  });
}
