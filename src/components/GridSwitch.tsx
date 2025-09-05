"use client";

interface GridSwitchProps {
  isGridEnabled: boolean;
  onToggle: (isEnabled: boolean) => void;
}

export default function GridSwitch({ isGridEnabled, onToggle }: GridSwitchProps) {
  return (
    <div className="flex items-center">
      <span className="mr-2 text-gray-700">Grid</span>
      <button
        onClick={() => onToggle(!isGridEnabled)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out ${
          isGridEnabled ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
            isGridEnabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
