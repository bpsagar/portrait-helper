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
}: {
  slug: string;
  stepNo: number;
  options?: Partial<Options>;
  opacity?: number;
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
        setImageDataUrl(canvas.toDataURL());
      }
    };
    processImage();
  }, [slug, stepNo, tutorial.image, options]);
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
