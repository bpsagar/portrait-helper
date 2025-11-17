"use client";

import { useState } from "react";
import NavigationButtons from "@/components/NavigationButtons";
import LogoWithTitle from "@/components/LogoWithTitle";
import ShadedImage from "@/components/ShadedImage";
import { useIsClient } from "@/lib/hooks";

const STEPS = 8;

export default function DrawPage() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const isClient = useIsClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  if (!isClient) {
    return null;
  }

  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LogoWithTitle />
        <h1 className="text-2xl font-bold mb-4">Shades Drawing Helper</h1>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="p-2 border rounded"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4">Shades Drawing Helper</h1>
        <ShadedImage
            imageUrl={image}
            step={step}
        />
        <NavigationButtons
            step={step}
            setStep={setStep}
            maxSteps={STEPS}
        />
    </div>
  );
}
