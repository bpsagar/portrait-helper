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

const ARContainer = ({
  slug,
  stepNo,
  tutorial,
}: {
  slug: string;
  stepNo: number;
  tutorial: Tutorial | undefined;
}) => {
  const [grid, setGrid] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [ar, setAr] = useState(false);
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
          isGridEnabled={grid}
        />
      )}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="flex items-center space-x-4">
          <GridSwitch isGridEnabled={grid} onToggle={setGrid} />
          <OpacitySlider opacity={opacity} onOpacityChange={setOpacity} />
          <ARSwitch isArEnabled={ar} onToggle={setAr} />
        </div>
      </div>
    </div>
  );
};

export default ARContainer;
