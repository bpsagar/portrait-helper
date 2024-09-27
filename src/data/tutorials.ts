import jensenAcklesReferenceImage from "@/../public/references/jensen-ackles.jpg";
import { Tutorial } from "./types";
import { Options } from "../lib/types";

export const tutorials: Tutorial[] = [
  {
    slug: "jensen-ackles",
    title: "Jensen Ackles",
    image: jensenAcklesReferenceImage,
    options: {
      contrastLevel: 20,
      numberOfShades: 10,
      grid: {
        size: 70,
        strokeSize: 1,
        strokeColor: 200,
      },
      hiddenGridCellColor: 255,
    },
    sections: [
      {
        title: "Eyes",
        showGridCells: [18, 19, 20, 24, 25, 26],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Nose",
        showGridCells: [24, 25, 26, 30, 31, 32],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
    ],
  },
];

export const convertTutorialToSteps = (tutorial: Tutorial): Options[] => {
  return tutorial.sections.reduce(
    (acc: Options[], section, index): Options[] => {
      const cumulativeShowGridCells = tutorial.sections
        .slice(0, index + 1)
        .flatMap((s) => s.showGridCells);

      const cellMaxShades: { [key: number]: number } = {};
      if (index > 0) {
        tutorial.sections.slice(0, index).forEach((prevSection) => {
          prevSection.showGridCells.forEach((cell) => {
            cellMaxShades[cell] = Math.max(...prevSection.maxGrayShades);
          });
        });
      }

      return [
        ...acc,
        ...section.maxGrayShades.map(
          (maxGrayShade): Options => ({
            contrastLevel: tutorial.options.contrastLevel,
            numberOfShades: tutorial.options.numberOfShades,
            grid: tutorial.options.grid,
            hiddenGridCellColor: tutorial.options.hiddenGridCellColor,
            showGridCells: cumulativeShowGridCells,
            maxGrayShade,
            highlightColor: [9, 188, 138],
            highlightCells: section.showGridCells,
            cellMaxShades,
          }),
        ),
      ];
    },
    [] as Options[],
  );
};

export const getTutorialStep = (slug: string, stepNo: number) => {
  const tutorial = tutorials.find((tutorial) => tutorial.slug === slug);
  if (!tutorial) {
    throw new Error("Tutorial not found");
  }
  const steps = convertTutorialToSteps(tutorial);
  if (stepNo > steps.length) {
    throw new Error("Step not found");
  }
  return steps[stepNo - 1];
};
