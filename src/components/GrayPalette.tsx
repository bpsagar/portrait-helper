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
    for (let i = 0; i < shades; i++) {
      const shade = Math.round((i / (shades - 1)) * 255);
      const backgroundColor = `rgb(${shade}, ${shade}, ${shade})`;
      squares.push(
        <div
          key={i}
          className={`w-8 h-8 ${i === highlightedIndex ? "border-2 border-mint-green" : "border border-gray-300"}`}
          style={{ backgroundColor }}
        />,
      );
    }
    return squares;
  };

  return <div className="flex flex-row gap-2">{generateShades()}</div>;
};

export default GrayPalette;
