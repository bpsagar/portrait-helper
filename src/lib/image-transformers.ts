import { ImageTransformer, Options } from "./types";

export const normalizeGrayShades: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const data = imageData.data;
  const grayShades = Array.from(
    { length: options.numberOfShades },
    (_, i) => (i * 255) / (options.numberOfShades - 1),
  );

  for (let i = 0; i < data.length; i += 4) {
    const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    const grayIndex = Math.round((grayscale / 255) * (grayShades.length - 1));
    const rounded = grayShades[grayIndex];

    data[i] = rounded;
    data[i + 1] = rounded;
    data[i + 2] = rounded;
  }

  return new ImageData(data, imageData.width, imageData.height);
};

export const adjustContrast: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const data = imageData.data;
  const factor =
    (259 * (options.contrastLevel + 255)) /
    (255 * (259 - options.contrastLevel));

  for (let i = 0; i < data.length; i += 4) {
    const red = factor * (data[i] - 128) + 128;
    const green = factor * (data[i + 1] - 128) + 128;
    const blue = factor * (data[i + 2] - 128) + 128;

    data[i] = Math.min(255, Math.max(0, red));
    data[i + 1] = Math.min(255, Math.max(0, green));
    data[i + 2] = Math.min(255, Math.max(0, blue));
  }

  return imageData;
};

export const filterDarkerGrays: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const grayShades = Array.from(
    { length: options.numberOfShades },
    (_, i) => (i * 255) / (options.numberOfShades - 1),
  );
  const data = imageData.data;
  const gridSize = 70;
  const numberOfCellsInRow = Math.round(imageData.width / gridSize);

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const cellNumber =
        Math.floor(y / gridSize) * numberOfCellsInRow +
        Math.floor(x / gridSize);
      const maxShade =
        options.cellMaxShades && options.cellMaxShades[cellNumber] !== undefined
          ? options.cellMaxShades[cellNumber]
          : options.maxGrayShade;

      const grayscale = data[i];
      if (grayscale > grayShades[maxShade]) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
  }
  return imageData;
};

const getRemainingCells = (
  imageSize: { width: number; height: number },
  gridSize: number,
  gridCells: number[],
) => {
  const numberOfCellsInRow = Math.round(imageSize.width / gridSize);
  const numberOfCellsInCol = Math.round(imageSize.height / gridSize);
  const totalCells = numberOfCellsInRow * numberOfCellsInCol;
  const remainingCells = [];
  for (let i = 0; i < totalCells; i++) {
    if (gridCells.indexOf(i) === -1) {
      remainingCells.push(i);
    }
  }
  return remainingCells;
};

export const showGridCells = (imageData: ImageData, options: Options) => {
  const data = imageData.data;
  const gridSize = 70;
  const gridCells = getRemainingCells(
    imageData,
    gridSize,
    options.showGridCells,
  );
  const numberOfCellsInRow = Math.round(imageData.width / gridSize);
  for (let i = 0; i < gridCells.length; i++) {
    const cell = gridCells[i];
    const x = (cell % numberOfCellsInRow) * gridSize;
    const y = Math.floor(cell / numberOfCellsInRow) * gridSize;
    for (let j = x; j < x + gridSize; j++) {
      for (let k = y; k < y + gridSize; k++) {
        const index = (j + k * imageData.width) * 4;
        data[index] = options.hiddenGridCellColor;
        data[index + 1] = options.hiddenGridCellColor;
        data[index + 2] = options.hiddenGridCellColor;
      }
    }
  }
  return imageData;
};
