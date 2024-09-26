import {
  addGridToImage,
  adjustContrast,
  filterDarkerGrays,
  highlightGridCells,
  normalizeGrayShades,
  showGridCells,
} from "./image-transformers";
import { ImageTransformer, Options } from "./types";

export const runPipeline = (imageData: ImageData, options: Options) => {
  const transformers: ImageTransformer[] = [
    normalizeGrayShades,
    adjustContrast,
    filterDarkerGrays,
    showGridCells,
    addGridToImage,
    highlightGridCells,
  ];
  return transformers.reduce((imageData, transformer) => {
    return transformer(imageData, options);
  }, imageData);
};
