"use client";

import { useState, useEffect } from "react";
import NavigationButtons from "@/components/NavigationButtons";
import LogoWithTitle from "@/components/LogoWithTitle";
import DrawARContainer from "@/components/DrawARContainer";

const STEPS = 8;

interface ImageHistoryItem {
  name: string;
  data: string;
}

export default function DrawPage() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);

  useEffect(() => {
    const storedHistory = sessionStorage.getItem("imageHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const updateHistory = (newHistory: ImageHistoryItem[]) => {
    setHistory(newHistory);
    sessionStorage.setItem("imageHistory", JSON.stringify(newHistory));
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

  if (!image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LogoWithTitle />
        <h1 className="text-2xl font-bold mb-4">Shades Drawing Helper</h1>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="p-2 border rounded"
        />
        {history.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Recent Images</h2>
            <ul className="border rounded">
              {history.map((item, index) => (
                <li key={index} className="flex items-center justify-between p-2 border-b">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.data}
                      alt={item.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => handleSelectFromHistory(item)}
                    >
                      {item.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteFromHistory(item)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Shades Drawing Helper</h1>
      <DrawARContainer imageUrl={image} step={step} />
      <NavigationButtons step={step} setStep={setStep} maxSteps={STEPS} />
    </div>
  );
}
