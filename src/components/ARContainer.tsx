"use client";
import DrawingReference from "@/components/DrawingReference";
import { getTutorialStep } from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import { Options } from "@/lib/types";
import { useEffect, useState } from "react";
import { DrawingSettingsContext } from "@/context/DrawingSettingsContext";
import GridSwitch from "./GridSwitch";
import OpacitySlider from "./OpacitySlider";
import ARSwitch from "./ARSwitch";

import { useDrawingSettings } from "@/context/DrawingSettingsContext";

const ARContainer = ({
  slug,
  stepNo,
  tutorial,
}: {
  slug: string;
  stepNo: number;
  tutorial: Tutorial | undefined;
}) => {
  const {
    isGridEnabled,
    setIsGridEnabled,
    opacity,
    setOpacity,
    isArEnabled,
    setIsArEnabled,
  } = useDrawingSettings();
  const [stepOptions, setStepOptions] = useState<Options | null>(null);

  useEffect(() => {
    if (tutorial) {
      const options = getTutorialStep(slug, stepNo);
      setStepOptions(options);
    }
  }, [slug, stepNo, tutorial]);
  return (
    <div className="relative">
      {tutorial && stepOptions && (
        <DrawingReference
          slug={slug}
          stepNo={stepNo}
          opacity={opacity}
          isGridEnabled={isGridEnabled}
        />
      )}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="flex items-center space-x-4">
          <GridSwitch isGridEnabled={isGridEnabled} onToggle={setIsGridEnabled} />
          <OpacitySlider opacity={opacity} onOpacityChange={setOpacity} />
          <ARSwitch isArEnabled={isArEnabled} onToggle={setIsArEnabled} />
        </div>
      </div>
    </div>
  );
};

export default ARContainer;
