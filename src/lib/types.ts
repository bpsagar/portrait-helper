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

  cellMaxShades: { [key: number]: number };

  meta: {
    title: string;
  };
}

export type ImageTransformer = (
  imageData: ImageData,
  options: Options,
) => ImageData;
