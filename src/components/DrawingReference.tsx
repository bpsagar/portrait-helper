"use client";

import { Options } from "@/lib/types";

import { getTutorialStep, tutorials } from "@/data/tutorials";
import { runPipeline } from "@/lib";
import ImageTag, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";

export default function DrawingReference({
  slug,
  stepNo,
  options,
  opacity = 1,
  isGridEnabled,
}: {
  slug: string;
  stepNo: number;
  options?: Partial<Options>;
  opacity?: number;
  isGridEnabled?: boolean;
}) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const tutorial = tutorials.find((tutorial) => tutorial.slug === slug)!;
  useEffect(() => {
    const processImage = async () => {
      const image = tutorial.image;
      const img = new Image();
      img.src = image.src;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const stepOptions = {
          ...getTutorialStep(slug, stepNo),
          ...options,
        };
        const finalImage = runPipeline(imageData, stepOptions);
        ctx.putImageData(finalImage, 0, 0);
        if (isGridEnabled) {
          drawGrid(ctx, image.width, image.height);
        }
        setImageDataUrl(canvas.toDataURL());
      }
    };
    processImage();
  }, [slug, stepNo, tutorial.image, options, isGridEnabled]);
  return (
    <div className="border-2 border-gray-200">
      {imageDataUrl && (
        <ImageTag
          src={imageDataUrl}
          alt={`Drawing reference for ${slug} step ${stepNo}`}
          width={560}
          height={100}
          style={{ opacity }}
        />
      )}
    </div>
  );
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
