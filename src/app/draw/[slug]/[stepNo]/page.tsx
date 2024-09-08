import DrawingReference from "@/components/DrawingReference";
import { convertTutorialToSteps, tutorials } from "@/data/tutorials";
import { Tutorial } from "@/data/types";

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
          image={tutorial.image}
          slug={params.slug}
          stepNo={stepNo}
        />
      )}
      <div>
        {stepNo > 1 && <a href={`/draw/${params.slug}/${stepNo - 1}`}>Back</a>}
      </div>
      <a href={`/draw/${params.slug}/${stepNo + 1}`}>Next</a>
    </div>
  );
}
