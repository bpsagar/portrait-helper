"use client";
import DrawingReference from "@/components/DrawingReference";
import { tutorials } from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import Link from "next/link";

export default function GalleryPage() {
  const tutorialsByCategory = tutorials.reduce((acc, tutorial) => {
    tutorial.categories.forEach((category) => {
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tutorial);
    });
    return acc;
  }, {} as Record<string, Tutorial[]>);

  return (
    <div className="bg-ivory min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Gallery</h1>
        {Object.entries(tutorialsByCategory).map(([category, tutorials]) => (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{category}</h2>
            <div className="flex overflow-x-auto gap-4 py-4">
              {tutorials.map((tutorial) => (
                <div key={tutorial.slug} className="flex-shrink-0 w-64">
                  <Link href={`/draw/${tutorial.slug}/1`}>
                    <DrawingReference slug={tutorial.slug} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
