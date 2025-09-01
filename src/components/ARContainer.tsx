"use client";

import { useEffect, useRef, useState } from "react";
import ARSwitch from "./ARSwitch";
import OpacitySlider from "./OpacitySlider";
import DrawingReference from "./DrawingReference";
import { Options } from "@/lib/types";

export default function ARContainer({
  slug,
  stepNo,
  tutorial,
}: {
  slug:string;
  stepNo: number;
  tutorial: any;
}) {
  const [isArEnabled, setIsArEnabled] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (isArEnabled) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "environment" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((err) => {
            console.error("Error accessing camera: ", err);
            setError(
              "Error accessing camera. Please make sure you have given permission and are on a secure connection (HTTPS).",
            );
          });
      } else {
        setError(
          "AR mode is not supported on this browser or device. Please use a modern browser on a secure connection (HTTPS).",
        );
      }
    } else {
      setOpacity(1);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isArEnabled]);

  return (
    <div>
      <div className="container mx-auto px-4 flex items-center justify-center gap-4 my-4">
        <ARSwitch isArEnabled={isArEnabled} onToggle={setIsArEnabled} />
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
        <div style={{ zIndex: 1, position: "relative" }}>
          {tutorial && (
            <DrawingReference
              key={`${slug}-${stepNo}`}
              slug={slug}
              stepNo={stepNo}
              opacity={opacity}
            />
          )}
        </div>
      </div>
    </div>
  );
}
