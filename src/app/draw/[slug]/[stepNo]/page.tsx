import ARContainer from "@/components/ARContainer";
import DrawingReference from "@/components/DrawingReference";
import GrayPalette from "@/components/GrayPalette";
import { getTutorialStep } from "@/data/tutorials";

interface PageProps {
  params: {
    slug: string;
    stepNo: string;
  };
}

export default function Page({ params }: PageProps) {
  const { slug, stepNo } = params;
  const options = getTutorialStep(slug, parseInt(stepNo));
  return (
    <div className="flex flex-col md:flex-row h-screen bg-ivory">
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="w-full h-full p-4 md:p-12">
          <DrawingReference
            slug={slug}
            stepNo={parseInt(stepNo)}
            opacity={0.5}
          />
        </div>
      </div>
      <div className="w-full md:w-12 flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <ARContainer />
        </div>
        <div className="flex-shrink-0">
          <GrayPalette options={options} />
        </div>
      </div>
    </div>
  );
}
