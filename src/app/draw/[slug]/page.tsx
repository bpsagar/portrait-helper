import DrawingReference from "@/components/DrawingReference";
import { tutorials } from "@/data/tutorials";

export async function generateStaticParams() {
  return tutorials;
}

export default function Page({ params }: { params: { slug: string } }) {
  const tutorial = tutorials.find((tutorial) => tutorial.slug === params.slug);
  return (
    <div>
      <h1>Draw portrait of {params.slug}</h1>
      {tutorial && <DrawingReference image={tutorial.image} />}
    </div>
  );
}
