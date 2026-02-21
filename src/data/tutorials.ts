import messiReferenceImage from "@/../public/references/messi.jpg";
import ronaldoReferenceImage from "@/../public/references/ronaldo.jpg";
import akramDeptqReferenceImage from "@/../public/references/akram-deptq.jpg";
import eyesReferenceImage from "@/../public/references/eyes.jpg";
import { Tutorial } from "./types";
import { Options } from "../lib/types";

export const tutorials: Tutorial[] = [
  {
    slug: "messi",
    title: "Lionel Messi",
    image: messiReferenceImage,
    options: {
      contrastLevel: 20,
      numberOfShades: 8,
      hiddenGridCellColor: 255,
    },
    sections: [
      {
        title: "Eyes",
        showGridCells: [20, 21, 22],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Nose",
        showGridCells: [27, 28],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Mouth",
        showGridCells: [33, 34],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Chin, cheeks and jaw",
        showGridCells: [26, 29, 32, 35, 37, 38, 39, 40, 41],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Ear",
        showGridCells: [24, 25, 30, 31],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Hair",
        showGridCells: [
          0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 12, 13, 16, 17, 18, 19, 23,
        ],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Rest of the face",
        showGridCells: [14, 15, 43, 44, 45, 46, 47],
        maxGrayShades: [1, 2, 3],
      },
    ],
  },
  {
    slug: "ronaldo",
    title: "Cristiano Ronaldo",
    image: ronaldoReferenceImage,
    options: {
      contrastLevel: 20,
      numberOfShades: 8,
      hiddenGridCellColor: 255,
    },
    sections: [
      {
        title: "Eyes",
        showGridCells: [19, 20, 21, 22],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Nose",
        showGridCells: [25, 26, 27],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Mouth",
        showGridCells: [31, 32, 33],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Chin, cheeks and jaw",
        showGridCells: [30, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Ear",
        showGridCells: [24, 28, 29, 30, 34, 35],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Hair",
        showGridCells: [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 23,
        ],
        maxGrayShades: [1, 2, 3],
      },
    ],
  },
  {
    slug: "akram-deptq",
    title: "Akram from Dept Q TV Series",
    image: akramDeptqReferenceImage,
    options: {
      contrastLevel: 0,
      numberOfShades: 8,
      hiddenGridCellColor: 255,
    },
    sections: [
      {
        title: "Eyes",
        showGridCells: [20, 21, 22],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Nose",
        showGridCells: [27],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Mouth",
        showGridCells: [26, 32, 33],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Chin, cheeks and jaw",
        showGridCells: [31, 32, 34, 28, 25],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Ear",
        showGridCells: [19, 13],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Hair",
        showGridCells: [
          1, 2, 3, 7, 8, 9, 10, 11, 14, 15, 16, 17, 23,
        ],
        maxGrayShades: [1, 2, 3],
      },
      {
        title: "Clothes and background",
        showGridCells: [
          0, 4, 5, 6, 12, 18, 24, 29, 30, 35, 36, 37, 38, 39, 40, 41, 42, 43,
          44, 45, 46, 47,
        ],
        maxGrayShades: [1, 2, 3],
      }
    ],
  },
  {
    slug: "eyes",
    title: "eyes",
    image: eyesReferenceImage,
    options: {
      contrastLevel: 10,
      numberOfShades: 8,
      hiddenGridCellColor: 255,
    },
    sections: [
      {
        title: "",
        showGridCells: Array.from({ length: 48 }, (_, i) => i),
        maxGrayShades: [0, 1, 2, 3, 5, 7],
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
          Math.max(...tutorial.sections.flatMap((s) => s.maxGrayShades)) -
          1, // no need to include the last shade as it's white
      },
      (_, index) => {
        const maxGrayShade =
          index +
          Math.max(...tutorial.sections.flatMap((s) => s.maxGrayShades));
        return {
          contrastLevel: tutorial.options.contrastLevel,
          numberOfShades: tutorial.options.numberOfShades,
          hiddenGridCellColor: tutorial.options.hiddenGridCellColor,
          showGridCells: tutorial.sections.flatMap((s) => s.showGridCells),
          maxGrayShade,
          highlightColor: [9, 188, 138],
          highlightCells: [],
          cellMaxShades: {},
          meta: {
            title: "Highlights",
          },
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
