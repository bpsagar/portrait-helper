"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import ArrowLeftIcon from "@/components/ArrowLeftIcon";
import ArrowRightIcon from "@/components/ArrowRightIcon";

interface NavigationButtonsProps {
  slug: string;
  title: string;
  stepNo: number;
  totalSteps: number;
}

export default function NavigationButtons({
  slug,
  title,
  stepNo,
  totalSteps,
}: NavigationButtonsProps) {
  const router = useRouter();

  const handleNavigation = useCallback(
    (newStepNo: number) => {
      router.push(`/draw/${slug}/${newStepNo}`);
    },
    [slug, router],
  );

  const isFirstStep = stepNo === 1;
  const isLastStep = stepNo === totalSteps;

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center">
      <div className="flex justify-between items-center w-full max-w-[400px] p-4 bg-white shadow-md">
        <div>
          <Link
            href={`/draw/${slug}/${stepNo - 1}`}
            onClick={() => !isFirstStep && handleNavigation(stepNo - 1)}
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              isFirstStep
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-gray-300 hover:bg-gray-400"
            } transition-colors`}
          >
            <ArrowLeftIcon width={16} height={16} />
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-500">
            Step {stepNo} of {totalSteps}
          </span>
          <h2 className="text-lg font-bold text-gray-800 font-sans">{title}</h2>
        </div>
        <div>
          <Link
            href={`/draw/${slug}/${stepNo + 1}`}
            onClick={() => !isLastStep && handleNavigation(stepNo + 1)}
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              isLastStep
                ? "bg-gray-200 cursor-not-allowed"
                : "bg-gray-300 hover:bg-gray-400"
            } transition-colors`}
          >
            <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
