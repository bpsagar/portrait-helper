"use client";

import { useEffect, useRef } from "react";

interface ShadedImageProps {
  imageUrl: string;
  step: number;
}

const SHADES = [0, 36, 73, 109, 146, 182, 219, 255]; // 8 shades of gray

export default function ShadedImage({ imageUrl, step }: ShadedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!context || !canvas) {
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const nearestShade = SHADES.reduce((prev, curr) => {
            return (Math.abs(curr - gray) < Math.abs(prev - gray) ? curr : prev);
        });
        const shadeIndex = SHADES.indexOf(nearestShade);

        let newGray = 255; // white

        if (step >= 1 && step <= 4) {
            // Reveal darks
            const threshold = 4 - step; // step 1: 3, step 2: 2, step 3: 1, step 4: 0
            if (shadeIndex <= threshold) {
                newGray = SHADES[threshold];
            } else if (shadeIndex > threshold && shadeIndex <= 3) {
                newGray = nearestShade;
            }
        } else if (step > 4) {
            // Reveal lights
            const threshold = step - 1; // step 5: 4, step 8: 7
            if (shadeIndex <= threshold) {
                newGray = nearestShade;
            }
        }

        data[i] = newGray;
        data[i + 1] = newGray;
        data[i + 2] = newGray;
      }
      context.putImageData(imageData, 0, 0);
    };
  }, [imageUrl, step]);

  return <canvas ref={canvasRef} />;
}
