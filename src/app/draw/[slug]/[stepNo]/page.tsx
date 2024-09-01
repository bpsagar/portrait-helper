import DrawingReference from "@/components/DrawingReference";
import { tutorials } from "@/data/tutorials";

export async function generateStaticParams() {
  return tutorials;
}

export default function Page({
  params,
}: {
  params: { slug: string; stepNo: number };
}) {
  const tutorial = tutorials.find((tutorial) => tutorial.slug === params.slug);
  return (
    <div>
      <h1>Draw portrait of {params.slug}</h1>
      {tutorial && (
        <DrawingReference
          image={tutorial.image}
          slug={params.slug}
          stepNo={params.stepNo}
        />
      )}
      <div>
        {params.stepNo > 1 && (
          <a href={`/draw/${params.slug}/${params.stepNo - 1}`}>Back</a>
        )}
      </div>
      <a href={`/draw/${params.slug}/${+params.stepNo + 1}`}>Next</a>
    </div>
  );
}
