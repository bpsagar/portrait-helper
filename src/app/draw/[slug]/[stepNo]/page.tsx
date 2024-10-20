import Navbar from "@/components/Navbar";
import NavigationButtons from "@/components/NavigationButtons";
import DrawingReference from "@/components/DrawingReference";
import { convertTutorialToSteps, tutorials } from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import { Options } from "@/lib/types";

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

  let totalSteps = 0;
  if (tutorial) {
    steps = convertTutorialToSteps(tutorial);
    totalSteps = steps.length;
  }
  return (
    <div>
      {tutorial && <Navbar name={tutorial.title} />}
      <div className="mt-16">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          {tutorial && (
            <DrawingReference
              key={`${params.slug}-${stepNo}`}
              image={tutorial.image}
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
