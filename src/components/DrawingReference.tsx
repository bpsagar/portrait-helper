"use client";

import { runPipeline } from "@/lib";
import ImageTag, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";

export default function DrawingReference({
  image,
}: {
  image: StaticImageData;
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
        const finalImage = runPipeline(imageData, {
          contrastLevel: 20,
          numberOfShades: 10,
          grid: {
            size: 70,
            strokeSize: 1,
            strokeColor: 200,
          },
          hiddenGridCellColor: 255,
          maxGrayShade: 5,
          showGridCells: [18, 19, 20, 24, 25, 26],
        });
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
