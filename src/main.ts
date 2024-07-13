import {
  addGridToImage,
  adjustContrast,
  filterDarkerGrays,
  generateGrid,
  roundToNearestGray,
} from './utils';

const processImage = (
  inputId: string,
  outputId: string,
  numLevels: number,
  contrast: number,
  maxGrayLevel: number,
  gridSize: number,
  gridStrokeSize: number,
) => {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const output = document.getElementById(outputId) as HTMLImageElement;
  const image = new Image();
  image.src = URL.createObjectURL(input.files![0]);
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      const grayLevels = Array.from(
        { length: numLevels },
        (_, i) => (i * 255) / (numLevels - 1),
      );
      const finalImage = addGridToImage(
        filterDarkerGrays(
          adjustContrast(roundToNearestGray(imageData, grayLevels), contrast),
          maxGrayLevel,
        ),
        gridSize,
        gridStrokeSize,
      );
      ctx.putImageData(finalImage, 0, 0);
      output.src = canvas.toDataURL();
    }
  };
};

const getValues = () => {
  const contrast = parseFloat(
    (document.getElementById('contrast') as HTMLInputElement).value,
  );
  const numLevels = parseInt(
    (document.getElementById('numLevels') as HTMLInputElement).value,
  );
  const maxGrayLevel =
    (parseInt(
      (document.getElementById('maxGrayLevel') as HTMLInputElement).value,
    ) *
      255) /
    numLevels;
  const gridSize = parseInt(
    (document.getElementById('gridSize') as HTMLInputElement).value,
  );
  const gridStrokeSize = parseInt(
    (document.getElementById('strokeSize') as HTMLInputElement).value,
  );
  return { contrast, numLevels, maxGrayLevel, gridSize, gridStrokeSize };
};

const onChange = () => {
  const { contrast, numLevels, maxGrayLevel, gridSize, gridStrokeSize } =
    getValues();
  processImage(
    'input',
    'output',
    numLevels,
    contrast,
    maxGrayLevel,
    gridSize,
    gridStrokeSize,
  );
};

const main = () => {
  document.getElementById('input')?.addEventListener('change', onChange);
  document.getElementById('contrast')?.addEventListener('input', onChange);
  document.getElementById('numLevels')?.addEventListener('input', onChange);
  document.getElementById('maxGrayLevel')?.addEventListener('input', onChange);
  document.getElementById('gridSize')?.addEventListener('input', onChange);
  document.getElementById('strokeSize')?.addEventListener('input', onChange);
};

main();
