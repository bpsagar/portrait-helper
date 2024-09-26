export interface Options {
  // setup
  contrastLevel: number;
  numberOfShades: number;
  grid: {
    size: number;
    strokeSize: number;
    strokeColor: number;
  };
  hiddenGridCellColor: number;

  // steps
  maxGrayShade: number;
  showGridCells: number[];

  highlightColor: number[];
  highlightCells: number[];
}
export type ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => ImageData;
