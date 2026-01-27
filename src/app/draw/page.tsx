"use client";

import { useState, useEffect } from "react";
import NavigationButtons from "@/components/NavigationButtons";
import LogoWithTitle from "@/components/LogoWithTitle";
import DrawARContainer from "@/components/DrawARContainer";
import ShadedImage from "@/components/ShadedImage";
import Image from "next/image";

interface ImageHistoryItem {
  name: string;
  data: string;
}

export default function DrawPage() {
  const [step, setStep] = useState(1);
  const [numShades, setNumShades] = useState(8);
  const [contrast, setContrast] = useState(100);
  const [image, setImage] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("imageHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    setStep(1);
  }, [numShades]);

  const updateHistory = (newHistory: ImageHistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem("imageHistory", JSON.stringify(newHistory));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageHistoryItem = {
          name: file.name,
          data: e.target?.result as string,
        };
        setImage(newImage.data);
        const newHistory = [newImage, ...history.filter(h => h.name !== newImage.name)];
        updateHistory(newHistory);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectFromHistory = (selectedImage: ImageHistoryItem) => {
    setImage(selectedImage.data);
  };

  const handleDeleteFromHistory = (imageToDelete: ImageHistoryItem) => {
    const newHistory = history.filter((item) => item.name !== imageToDelete.name);
    updateHistory(newHistory);
  };

  if (!showSteps) {
    return (
      <div className="flex flex-col items-center min-h-screen p-4 bg-gray-50">
        <LogoWithTitle />
        <h1 className="text-2xl font-bold mb-8">Shades Drawing Helper</h1>

        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
          {/* Left Pane: Selection & Settings */}
          <div className="flex-1 flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">
                  1
                </span>
                Select Image
              </h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />

              {history.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Or choose from recent images:
                  </p>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {history.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-2 border rounded-lg transition-colors ${
                          image === item.data
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          id={`history-${index}`}
                          name="imageHistory"
                          checked={image === item.data}
                          onChange={() => handleSelectFromHistory(item)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`history-${index}`}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <Image
                            src={item.data}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded shadow-sm"
                            width={40}
                            height={40}
                          />
                          <span className="text-sm font-medium truncate text-gray-700">
                            {item.name}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeleteFromHistory(item)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${item.name}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {image && (
              <>
                <section className="flex flex-col gap-4 pt-4 border-t border-gray-100">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm">
                      2
                    </span>
                    Adjust Settings
                  </h2>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label
                          htmlFor="numShades"
                          className="text-sm font-medium text-gray-700"
                        >
                          Number of Shades
                        </label>
                        <input
                          type="number"
                          value={numShades}
                          onChange={(e) =>
                            setNumShades(
                              Math.max(2, Math.min(16, parseInt(e.target.value) || 2))
                            )
                          }
                          className="w-16 p-1 text-center border rounded text-sm font-semibold text-blue-700"
                        />
                      </div>
                      <input
                        id="numShades-slider"
                        type="range"
                        min="2"
                        max="16"
                        value={numShades}
                        onChange={(e) => setNumShades(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <label
                          htmlFor="contrast"
                          className="text-sm font-medium text-gray-700"
                        >
                          Contrast (%)
                        </label>
                        <input
                          type="number"
                          value={contrast}
                          onChange={(e) =>
                            setContrast(
                              Math.max(0, Math.min(200, parseInt(e.target.value) || 0))
                            )
                          }
                          className="w-16 p-1 text-center border rounded text-sm font-semibold text-blue-700"
                        />
                      </div>
                      <input
                        id="contrast-slider"
                        type="range"
                        min="0"
                        max="200"
                        value={contrast}
                        onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </section>

                <button
                  onClick={() => setShowSteps(true)}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  Continue to Drawing
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Right Pane: Preview */}
          <div className="flex-1 flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[400px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Preview (Final Result)</h2>
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative">
              {image ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <ShadedImage
                    imageUrl={image}
                    step={numShades}
                    numShades={numShades}
                    contrast={contrast}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm">Select an image to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 pb-32">
      <div className="w-full bg-white shadow-sm p-4 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Shades Drawing Helper</h1>
        <button
          onClick={() => setShowSteps(false)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Settings
        </button>
      </div>
      <DrawARContainer
        imageUrl={image!}
        step={step}
        numShades={numShades}
        contrast={contrast}
      />
      <NavigationButtons step={step} setStep={setStep} maxSteps={numShades} />
    </div>
  );
}
