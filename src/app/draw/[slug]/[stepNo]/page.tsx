import DrawingReference from "@/components/DrawingReference";
import { convertTutorialToSteps, tutorials } from "@/data/tutorials";
import { Tutorial } from "@/data/types";
import NavigationButtons from "@/components/NavigationButtons";

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

  return (
    <div>
      <h1>Draw portrait of {params.slug}</h1>
      {tutorial && (
        <DrawingReference
          key={`${params.slug}-${stepNo}`}
          image={tutorial.image}
          slug={params.slug}
          stepNo={stepNo}
        />
      )}
      <NavigationButtons slug={params.slug} stepNo={stepNo} />
    </div>
  );
}
