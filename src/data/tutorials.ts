import jensenAcklesReferenceImage from "@/../public/references/jensen-ackles.jpg";
import { Tutorial } from "./types";

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
    ],
  },
];
