export const roundToNearestGray = (
  imageData: ImageData,
  grayLevels: number[],
) => {
  var data = imageData.data;
  for (var i = 0; i < data.length; i += 4) {
    var grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
    var rounded =
      grayLevels[
        Math.round(
          (grayscale / 255) * (grayLevels.length - 1) -
            0.5 +
            (grayLevels[0] - grayscale) / (grayLevels[0] - grayLevels[1]),
        )
      ];
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
