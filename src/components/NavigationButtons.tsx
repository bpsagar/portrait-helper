"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface NavigationButtonsProps {
  slug: string;
  stepNo: number;
  totalSteps: number;
}

export default function NavigationButtons({
  slug,
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

  const isLastStep = stepNo === totalSteps;

  return (
    <div>
      {stepNo > 1 && (
        <Link
          href={`/draw/${slug}/${stepNo - 1}`}
          onClick={() => handleNavigation(stepNo - 1)}
        >
          Back
        </Link>
      )}
      {!isLastStep && (
        <Link
          href={`/draw/${slug}/${stepNo + 1}`}
          onClick={() => handleNavigation(stepNo + 1)}
        >
          Next
        </Link>
      )}
    </div>
  );
}
