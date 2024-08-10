export interface Options {
  // setup
  contrastLevel: number;
  numberOfShades: number;
  grid: {
    size: number;
    strokeSize: number;
    strokeColor: number;
  };

  // steps
  maxGrayShade: number;
  showGridCells: number[];
  hiddenGridCellColor: number;
}
export type ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => ImageData;

export const runPipeline = (
  imageData: ImageData,
  options: Options,
  transformers: ImageTransformer[],
) => {
  return transformers.reduce((imageData, transformer) => {
    return transformer(imageData, options);
  }, imageData);
};
