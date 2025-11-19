"use client";

import { useEffect, useRef, useState } from "react";

interface ShadedImageProps {
  imageUrl: string;
  step: number;
  isGridEnabled?: boolean;
}

const SHADES = [0, 36, 73, 109, 146, 182, 219, 255]; // 8 shades of gray

export default function ShadedImage({
  imageUrl,
  step,
  isGridEnabled,
}: ShadedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setStartPan({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - startPan.x,
        y: e.touches[0].clientY - startPan.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!image) return;

    const offscreenCanvas = document.createElement("canvas");
    const offscreenContext = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!offscreenContext) return;

    const maxWidth = window.innerWidth * 0.9;
    let width = image.width;
    let height = image.height;

    if (width > maxWidth) {
      height = height * (maxWidth / width);
      width = maxWidth;
    }

    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    offscreenContext.drawImage(image, 0, 0, width, height);
    const imageData = offscreenContext.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const nearestShade = SHADES.reduce((prev, curr) => {
        return Math.abs(curr - gray) < Math.abs(prev - gray) ? curr : prev;
      });
      const shadeIndex = SHADES.indexOf(nearestShade);

      let newGray = 255;

      if (step >= 1 && step <= 4) {
        const threshold = 4 - step;
        if (shadeIndex <= threshold) {
          newGray = SHADES[threshold];
        } else if (shadeIndex > threshold && shadeIndex <= 3) {
          newGray = nearestShade;
        }
      } else if (step > 4) {
        const threshold = step - 1;
        if (shadeIndex <= threshold) {
          newGray = nearestShade;
        }
      }

      data[i] = newGray;
      data[i + 1] = newGray;
      data[i + 2] = newGray;
    }

    if (isGridEnabled) {
      const gridSize = 70;
      const strokeSize = 1;
      const strokeColor = 0;
      for (let i = gridSize; i < width; i += gridSize) {
        for (let j = 0; j < height; j++) {
          for (let k = 0; k < strokeSize; k++) {
            const index = (i + k + j * width) * 4;
            data[index] = strokeColor;
            data[index + 1] = strokeColor;
            data[index + 2] = strokeColor;
          }
        }
      }
      for (let i = 0; i < width; i++) {
        for (let j = gridSize; j < height; j += gridSize) {
          for (let k = 0; k < strokeSize; k++) {
            const index = (i + (j + k) * width) * 4;
            data[index] = strokeColor;
            data[index + 1] = strokeColor;
            data[index + 2] = strokeColor;
          }
        }
      }
    }

    offscreenContext.putImageData(imageData, 0, 0);
    setProcessedCanvas(offscreenCanvas);
  }, [image, step, isGridEnabled]);

  useEffect(() => {
    if (!processedCanvas || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = processedCanvas.width;
    canvas.height = processedCanvas.height;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(pan.x, pan.y);
    context.scale(zoom, zoom);
    context.drawImage(processedCanvas, 0, 0);
    context.restore();
  }, [processedCanvas, pan, zoom]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="max-w-full h-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <button
          onClick={() => setZoom((z) => z * 1.2)}
          className="w-8 h-8 bg-gray-700 text-white rounded-full text-lg"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => z / 1.2)}
          className="w-8 h-8 bg-gray-700 text-white rounded-full text-lg"
        >
          -
        </button>
      </div>
    </div>
  );
}

