"use client";

interface OpacitySliderProps {
  opacity: number;
  onOpacityChange: (opacity: number) => void;
}

export default function OpacitySlider({
  opacity,
  onOpacityChange,
}: OpacitySliderProps) {
  return (
    <div className="flex items-center">
      <span className="mr-2 text-gray-700">Opacity</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={opacity}
        onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}
