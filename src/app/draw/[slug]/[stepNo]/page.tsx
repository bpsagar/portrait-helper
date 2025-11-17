import Navbar from "@/components/Navbar";
import NavigationButtons from "@/components/TutorialNavigationButtons";
import {
  convertTutorialToSteps,
  getTutorialStep,
  tutorials,
} from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import { Options } from "@/lib/types";
import GrayPalette from "@/components/GrayPalette";
import ARContainer from "@/components/ARContainer";

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

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; stepNo: string }>;
}) {
  const props = await params;
  const tutorial = tutorials.find((tutorial) => tutorial.slug === props.slug);
  const stepNo = +props.stepNo;
  let steps: Options[] = [];
  let stepOptions: Options | null = null;

  let totalSteps = 0;
  if (tutorial) {
    steps = convertTutorialToSteps(tutorial);
    stepOptions = getTutorialStep(props.slug, stepNo);
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
        <ARContainer slug={props.slug} stepNo={stepNo} tutorial={tutorial} />
        <div className="container mx-auto px-4">
          <NavigationButtons
            slug={props.slug}
            title={steps[stepNo - 1].meta.title}
            stepNo={stepNo}
            totalSteps={totalSteps}
          />
        </div>
      </div>
    </div>
  );
}