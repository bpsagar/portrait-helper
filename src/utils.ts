export const roundToNearestGray = (
  imageData: ImageData,
  grayLevels: number[],
) => {
  var data = imageData.data;
  for (var i = 0; i < data.length; i += 4) {
    var grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    const grayIndex = Math.round((grayscale / 255) * (grayLevels.length - 1));
    const rounded = grayLevels[grayIndex];
    data[i] = rounded;
    data[i + 1] = rounded;
    data[i + 2] = rounded;
  }
  return new ImageData(data, imageData.width, imageData.height);
};

export const adjustContrast = (imageData: ImageData, contrast: number) => {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

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

export const filterDarkerGrays = (imageDate: ImageData, grayLevel: number) => {
  const data = imageDate.data;
  for (let i = 0; i < data.length; i += 4) {
    const grayscale = data[i];
    if (grayscale > grayLevel) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  return imageDate;
};

export const addGridToImage = (
  imageData: ImageData,
  gridSize: number,
  strokeSize: number,
) => {
  const data = imageData.data;
  for (let i = 0; i < imageData.width; i += gridSize) {
    for (let j = 0; j < imageData.height; j++) {
      for (let k = 0; k < strokeSize; k++) {
        const index = (i + k + j * imageData.width) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
      }
    }
  }
  for (let i = 0; i < imageData.width; i++) {
    for (let j = 0; j < imageData.height; j += gridSize) {
      for (let k = 0; k < strokeSize; k++) {
        const index = (i + (j + k) * imageData.width) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
      }
    }
  }
  return imageData;
};
