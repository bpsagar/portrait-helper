"use client";

interface ColorSwitchProps {
  isColorModeEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

export default function ColorSwitch({ isColorModeEnabled, onToggle }: ColorSwitchProps) {
  return (
    <div className="flex items-center">
      <span className="mr-2 text-gray-700">Color Mode</span>
      <button
        onClick={() => onToggle(!isColorModeEnabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out ${
          isColorModeEnabled ? "bg-blue-500" : "bg-gray-300"
        }`}
        aria-label="Toggle Color Mode"
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
            isColorModeEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
