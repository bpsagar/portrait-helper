import messiReferenceImage from "@/../public/references/messi.jpg";
import { Tutorial } from "./types";
import { Options } from "../lib/types";

export const tutorials: Tutorial[] = [
  {
    slug: "messi",
    title: "Lionel Messi",
    image: messiReferenceImage,
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
        showGridCells: [20, 21, 22],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Nose",
        showGridCells: [27, 28],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Mouth",
        showGridCells: [33, 34],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Chin, cheeks and jaw",
        showGridCells: [26, 29, 32, 35, 37, 38, 39, 40, 41],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Ear",
        showGridCells: [24, 25, 30, 31],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Hair",
        showGridCells: [1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 16, 17, 18, 19, 23],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
      {
        title: "Rest of the face",
        showGridCells: [14, 15, 43, 44, 45, 46, 47],
        maxGrayShades: [0, 1, 2, 3, 4, 5],
      },
    ],
  },
];

export const convertTutorialToSteps = (tutorial: Tutorial): Options[] => {
  return [
    ...tutorial.sections.reduce((acc: Options[], section, index): Options[] => {
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
            meta: {
              title: section.title,
            },
          }),
        ),
      ];
    }, [] as Options[]),
    ...Array.from(
      {
        length:
          tutorial.options.numberOfShades -
          Math.max(...tutorial.sections.flatMap((s) => s.maxGrayShades)),
      },
      (_, index) => {
        const maxGrayShade = index + 6;
        return {
          contrastLevel: tutorial.options.contrastLevel,
          numberOfShades: tutorial.options.numberOfShades,
          grid: tutorial.options.grid,
          hiddenGridCellColor: tutorial.options.hiddenGridCellColor,
          showGridCells: tutorial.sections.flatMap((s) => s.showGridCells),
          maxGrayShade,
          highlightColor: [9, 188, 138],
          highlightCells: [],
          cellMaxShades: {},
        };
      },
    ),
  ];
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
