import React from "react";

interface GrayPaletteProps {
  shades: number;
  highlightedIndex: number;
}

const GrayPalette: React.FC<GrayPaletteProps> = ({
  shades,
  highlightedIndex,
}) => {
  const generateShades = () => {
    const squares: React.ReactNode[] = [];
    for (let i = 1; i < shades - 1; i++) {
      const shade = Math.round((i / (shades - 1)) * 255);
      const backgroundColor = `rgb(${shade}, ${shade}, ${shade})`;
      squares.push(
        <div
          key={i}
          className={`aspect-square flex-1 max-w-16 max-h-16 ${
            i === highlightedIndex
              ? "border-2 border-mint-green"
              : "border border-gray-300"
          }`}
          style={{ backgroundColor }}
        />,
      );
    }
    return squares;
  };

  return (
    <div className="flex flex-row gap-2 w-full max-w-screen-sm mx-auto justify-center">
      {generateShades()}
    </div>
  );
};

export default GrayPalette;
