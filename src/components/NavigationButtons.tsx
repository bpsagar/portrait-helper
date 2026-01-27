"use client";

import { Dispatch, SetStateAction, useCallback, useEffect } from "react";
import ArrowLeftIcon from "@/components/ArrowLeftIcon";
import ArrowRightIcon from "@/components/ArrowRightIcon";

interface NavigationButtonsProps {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  maxSteps: number;
}

export default function NavigationButtons({
  step,
  setStep,
  maxSteps,
}: NavigationButtonsProps) {
  const handleNavigation = useCallback(
    (newStep: number) => {
      if (newStep >= 1 && newStep <= maxSteps) {
        setStep(newStep);
      }
    },
    [maxSteps, setStep],
  );

  const isFirstStep = step === 1;
  const isLastStep = step === maxSteps;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && !isLastStep) {
        handleNavigation(step + 1);
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        handleNavigation(step - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNavigation, isFirstStep, isLastStep, step]);

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="flex justify-between items-center w-full max-w-[400px] p-4 bg-white shadow-md">
        <div>
          <button
            onClick={() => handleNavigation(step - 1)}
            disabled={isFirstStep}
            aria-label="left-arrow"
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 ${
              isFirstStep
                ? "text-slate-400 cursor-not-allowed"
                : "hover:bg-gray-200"
            } transition-colors`}
          >
            <ArrowLeftIcon width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500">
            Step {step} of {maxSteps}
          </span>
        </div>
        <div>
          <button
            onClick={() => handleNavigation(step + 1)}
            disabled={isLastStep}
            aria-label="right-arrow"
            className={`flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 ${
              isLastStep
                ? "text-slate-400 cursor-not-allowed"
                : "hover:bg-gray-400"
            } transition-colors`}
          >
            <ArrowRightIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
