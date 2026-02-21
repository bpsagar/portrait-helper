"use client";

import { useEffect, useRef, useState } from "react";

interface ShadedImageProps {
  imageUrl: string;
  step: number;
  numShades: number;
  contrast?: number;
  isColorModeEnabled?: boolean;
}

const SHADE_COLORS = [
  [255, 0, 0],     // Red
  [0, 0, 255],     // Blue
  [0, 128, 0],     // Green
  [255, 165, 0],   // Orange
  [128, 0, 128],   // Purple
  [0, 255, 255],   // Cyan
  [255, 0, 255],   // Magenta
  [0, 255, 0],     // Lime
  [255, 192, 203], // Pink
  [0, 128, 128],   // Teal
  [230, 190, 255], // Lavender
  [170, 110, 40],  // Brown
  [128, 128, 0],   // Olive
  [128, 0, 0],     // Maroon
  [0, 0, 128],     // Navy
  [255, 215, 0],   // Gold
];

export default function ShadedImage({
  imageUrl,
  step,
  numShades,
  contrast = 100,
  isColorModeEnabled = false,
}: ShadedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const activeElement = document.activeElement;
        const isInput =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          (activeElement as HTMLElement)?.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

    const shades = Array.from({ length: numShades }, (_, i) =>
      Math.round(255 * (i / (numShades - 1))),
    );
    const midIndex = Math.ceil(numShades / 2);
    const contrastFactor = contrast / 100;

    for (let i = 0; i < data.length; i += 4) {
      const originalGray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      let gray = originalGray;
      if (contrast !== 100) {
        gray = (originalGray - 128) * contrastFactor + 128;
        gray = Math.max(0, Math.min(255, gray));
      }

      const nearestShade = shades.reduce((prev, curr) => {
        return Math.abs(curr - gray) < Math.abs(prev - gray) ? curr : prev;
      });
      const shadeIndex = shades.indexOf(nearestShade);

      let finalShadeIndex = -1;
      if (step <= midIndex) {
        const darkThreshold = midIndex - step;
        if (shadeIndex < midIndex) {
          if (shadeIndex <= darkThreshold) {
            finalShadeIndex = darkThreshold;
          } else {
            finalShadeIndex = shadeIndex;
          }
        }
      } else {
        const overallThreshold = step - 1;
        if (shadeIndex <= overallThreshold) {
          finalShadeIndex = shadeIndex;
        }
      }

      if (finalShadeIndex !== -1) {
        if (isColorModeEnabled) {
          const color = SHADE_COLORS[finalShadeIndex % SHADE_COLORS.length];
          data[i] = color[0];
          data[i + 1] = color[1];
          data[i + 2] = color[2];
        } else {
          const grayValue = shades[finalShadeIndex];
          data[i] = grayValue;
          data[i + 1] = grayValue;
          data[i + 2] = grayValue;
        }
      } else {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }

    offscreenContext.putImageData(imageData, 0, 0);
    setProcessedCanvas(offscreenCanvas);
  }, [image, step, numShades, contrast, isColorModeEnabled]);

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
    <div ref={containerRef} className="shaded-image-container relative bg-white flex items-center justify-center">
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
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center"
          aria-label="Toggle Fullscreen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
