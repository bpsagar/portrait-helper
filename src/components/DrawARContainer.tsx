"use client";

import { useEffect, useRef, useState } from "react";
import ARSwitch from "./ARSwitch";
import GridSwitch from "./GridSwitch";
import OpacitySlider from "./OpacitySlider";
import { useDrawingSettings } from "@/context/DrawingSettingsContext";
import ShadedImage from "./ShadedImage";

export default function DrawARContainer({
  imageUrl,
  step,
  numShades,
  contrast,
}: {
  imageUrl: string;
  step: number;
  numShades: number;
  contrast: number;
}) {
  const {
    isArEnabled,
    setIsArEnabled,
    isGridEnabled,
    setIsGridEnabled,
    opacity,
    setOpacity,
  } = useDrawingSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isArEnabled) {
      setOpacity(1);
      return;
    }

    setError(null);
    let stream: MediaStream | null = null;

    const enableAr = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          "AR mode is not supported on this browser or device. Please use a modern browser on a secure connection (HTTPS).",
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setError(
          "Error accessing camera. Please make sure you have given permission and are on a secure connection (HTTPS).",
        );
      }
    };

    enableAr();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isArEnabled, setOpacity]);

  return (
    <div>
      <div className="container mx-auto px-4 flex items-center justify-center gap-4 my-4">
        <ARSwitch isArEnabled={isArEnabled} onToggle={setIsArEnabled} />
        <GridSwitch isGridEnabled={isGridEnabled} onToggle={setIsGridEnabled} />
        {isArEnabled && (
          <OpacitySlider opacity={opacity} onOpacityChange={setOpacity} />
        )}
      </div>
      {error && <div className="text-red-500 text-center pb-4">{error}</div>}
      <div className="container mx-auto px-4 py-4 flex items-center justify-center mb-24 relative">
        {isArEnabled && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
          />
        )}
        <div style={{ zIndex: 1, position: "relative", opacity }}>
          <ShadedImage
            imageUrl={imageUrl}
            step={step}
            numShades={numShades}
            isGridEnabled={isGridEnabled}
            contrast={contrast}
          />
        </div>
      </div>
    </div>
  );
}
