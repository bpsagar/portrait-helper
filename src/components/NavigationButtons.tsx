'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function NavigationButtons({ slug, stepNo }: { slug: string; stepNo: number }) {
  const router = useRouter();

  const handleNavigation = useCallback((newStepNo: number) => {
    router.push(`/draw/${slug}/${newStepNo}`);
  }, [slug, router]);

  return (
    <div>
      {stepNo > 1 && (
        <Link href={`/draw/${slug}/${stepNo - 1}`} onClick={() => handleNavigation(stepNo - 1)}>
          Back
        </Link>
      )}
      <Link href={`/draw/${slug}/${stepNo + 1}`} onClick={() => handleNavigation(stepNo + 1)}>
        Next
      </Link>
    </div>
  );
}
