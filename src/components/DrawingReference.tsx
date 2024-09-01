"use client";

import { getTutorialStep } from "@/data/tutorials";
import { runPipeline } from "@/lib";
import ImageTag, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";

export default function DrawingReference({
  image,
  slug,
  stepNo,
}: {
  image: StaticImageData;
  slug: string;
  stepNo: number;
}) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = image.src;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const stepOptions = getTutorialStep(slug, stepNo);
        const finalImage = runPipeline(imageData, stepOptions);
        ctx.putImageData(finalImage, 0, 0);
        setImageDataUrl(canvas.toDataURL());
      }
    };
  });
  return (
    <div>
      {imageDataUrl && (
        <ImageTag
          src={imageDataUrl}
          alt={"todo: drawing reference"}
          width={560}
          height={100}
        />
      )}
    </div>
  );
}
