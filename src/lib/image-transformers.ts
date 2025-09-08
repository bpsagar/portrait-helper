import { ImageTransformer, Options } from "./types";
import { Image } from "image-js";

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

export const createOutline: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const grayShades = Array.from(
    { length: options.numberOfShades },
    (_, i) => (i * 255) / (options.numberOfShades - 1),
  );

  // Create a new greyscale data array and filter it at the same time.
  const greyData = new Uint8Array(imageData.width * imageData.height);
  for (let i = 0; i < greyData.length; i++) {
    const grayscale = imageData.data[i * 4];
    const shadeIndex = grayShades.findIndex(
      (shade) => Math.abs(shade - grayscale) < 1,
    );
    if (shadeIndex > 3) {
      greyData[i] = 255; // white
    } else {
      greyData[i] = grayscale;
    }
  }

  const image = new Image(imageData.width, imageData.height, {
    data: greyData,
    colorModel: "GREY",
  });

  const edge = image.cannyEdgeDetector({
    lowThreshold: 10,
    highThreshold: 50,
    gaussianBlur: 1.2,
  });

  // The 'edge' is a binary image (Mask). The edges are 1, the rest is 0.
  // I should make the edges black and the rest white.
  const edgeData = edge.data; // This is a Uint8Array (or similar) of 0s and 1s.
  const rgbaData = new Uint8ClampedArray(imageData.data.length);
  for (let i = 0; i < edgeData.length; i++) {
    const value = edgeData[i] === 1 ? 0 : 255;
    rgbaData[i * 4] = value;
    rgbaData[i * 4 + 1] = value;
    rgbaData[i * 4 + 2] = value;
    rgbaData[i * 4 + 3] = 255;
  }

  return new ImageData(rgbaData, imageData.width, imageData.height);
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
  const gridSize = options.grid.size;
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

export const highlightGridCells: ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => {
  const data = imageData.data;
  const gridSize = options.grid.size;
  const strokeSize = options.grid.strokeSize;
  const highlightColor = options.highlightColor || [255, 0, 0]; // Default to red if not specified
  const numberOfCellsInRow = Math.round(imageData.width / gridSize);

  const highlightedCells = new Set(options.highlightCells);

  options.highlightCells.forEach((cell) => {
    const x = (cell % numberOfCellsInRow) * gridSize;
    const y = Math.floor(cell / numberOfCellsInRow) * gridSize;

    // Draw top border if the cell above is not highlighted
    if (!highlightedCells.has(cell - numberOfCellsInRow)) {
      for (let i = x; i < x + gridSize; i++) {
        for (let j = 0; j < strokeSize; j++) {
          const topIndex = (i + (y + j) * imageData.width) * 4;
          data[topIndex] = highlightColor[0];
          data[topIndex + 1] = highlightColor[1];
          data[topIndex + 2] = highlightColor[2];
        }
      }
    }

    // Draw bottom border if the cell below is not highlighted
    if (!highlightedCells.has(cell + numberOfCellsInRow)) {
      for (let i = x; i < x + gridSize; i++) {
        for (let j = 0; j < strokeSize; j++) {
          const bottomIndex =
            (i + (y + gridSize - j - 1) * imageData.width) * 4;
          data[bottomIndex] = highlightColor[0];
          data[bottomIndex + 1] = highlightColor[1];
          data[bottomIndex + 2] = highlightColor[2];
        }
      }
    }

    // Draw left border if the cell to the left is not highlighted
    if (!highlightedCells.has(cell - 1)) {
      for (let i = y; i < y + gridSize; i++) {
        for (let j = 0; j < strokeSize; j++) {
          const leftIndex = (x + j + i * imageData.width) * 4;
          data[leftIndex] = highlightColor[0];
          data[leftIndex + 1] = highlightColor[1];
          data[leftIndex + 2] = highlightColor[2];
        }
      }
    }

    // Draw right border if the cell to the right is not highlighted
    if (!highlightedCells.has(cell + 1)) {
      for (let i = y; i < y + gridSize; i++) {
        for (let j = 0; j < strokeSize; j++) {
          const rightIndex = (x + gridSize - j - 1 + i * imageData.width) * 4;
          data[rightIndex] = highlightColor[0];
          data[rightIndex + 1] = highlightColor[1];
          data[rightIndex + 2] = highlightColor[2];
        }
      }
    }
  });

  return imageData;
};
