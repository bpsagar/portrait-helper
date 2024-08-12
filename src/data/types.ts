import { StaticImageData } from "next/image";

interface TutorialSection {
  title: string;
  showGridCells: number[];
  maxGrayShades: number[]; // each shade from low to high creates multiple steps
}

export interface Tutorial {
  slug: string;
  title: string;
  image: StaticImageData;
  options: {
    contrastLevel: number;
    numberOfShades: number;
    grid: {
      size: number;
      strokeSize: number;
      strokeColor: number;
    };
    hiddenGridCellColor: number;
  };
  sections: TutorialSection[];
}
