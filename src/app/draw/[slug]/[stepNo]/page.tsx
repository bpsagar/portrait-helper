import Navbar from "@/components/Navbar";
import NavigationButtons from "@/components/NavigationButtons";
import DrawingReference from "@/components/DrawingReference";
import {
  convertTutorialToSteps,
  getTutorialStep,
  tutorials,
} from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import { Options } from "@/lib/types";
import GrayPalette from "@/components/GrayPalette";

export async function generateStaticParams() {
  return tutorials
    .map((tutorial: Tutorial) => {
      const steps = convertTutorialToSteps(tutorial);
      return steps.map((_, index) => ({
        slug: tutorial.slug,
        stepNo: String(index + 1),
      }));
    })
    .reduce((acc, curr) => [...acc, ...curr], []);
}

export default function Page({
  params,
}: {
  params: { slug: string; stepNo: string };
}) {
  const tutorial = tutorials.find((tutorial) => tutorial.slug === params.slug);
  const stepNo = +params.stepNo;
  let steps: Options[] = [];
  let stepOptions: Options | null = null;

  let totalSteps = 0;
  if (tutorial) {
    steps = convertTutorialToSteps(tutorial);
    stepOptions = getTutorialStep(params.slug, stepNo);
    totalSteps = steps.length;
  }
  return (
    <div>
      {tutorial && <Navbar name={tutorial.title} />}
      <div className="mt-16">
        <div className="container mx-auto px-4 flex items-center justify-center">
          {tutorial && stepOptions && (
            <GrayPalette
              shades={tutorial.options.numberOfShades}
              highlightedIndex={stepOptions.maxGrayShade}
            />
          )}
        </div>
        <div className="container mx-auto px-4 py-4 flex items-center justify-center mb-24">
          {tutorial && (
            <DrawingReference
              key={`${params.slug}-${stepNo}`}
              slug={params.slug}
              stepNo={stepNo}
            />
          )}
        </div>
        <div className="container mx-auto px-4">
          <NavigationButtons
            slug={params.slug}
            title={steps[stepNo - 1].meta.title}
            stepNo={stepNo}
            totalSteps={totalSteps}
          />
        </div>
      </div>
    </div>
  );
}
