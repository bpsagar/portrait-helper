import { ImageTransformer, Options } from './lib';

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
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grayscale = data[i];
    if (grayscale > options.maxGrayShade) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  return imageData;
};

export const addGridToImage: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const gridSize = options.grid.size;
  const strokeSize = options.grid.strokeSize;
  const strokeColor = options.grid.strokeColor;
  const data = imageData.data;
  for (let i = gridSize; i < imageData.width; i += gridSize) {
    for (let j = 0; j < imageData.height; j++) {
      for (let k = 0; k < strokeSize; k++) {
        const index = (i + k + j * imageData.width) * 4;
        data[index] = strokeColor;
        data[index + 1] = strokeColor;
        data[index + 2] = strokeColor;
      }
    }
  }
  for (let i = 0; i < imageData.width; i++) {
    for (let j = gridSize; j < imageData.height; j += gridSize) {
      for (let k = 0; k < strokeSize; k++) {
        const index = (i + (j + k) * imageData.width) * 4;
        data[index] = strokeColor;
        data[index + 1] = strokeColor;
        data[index + 2] = strokeColor;
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
  const gridSize = options.grid.size;
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
