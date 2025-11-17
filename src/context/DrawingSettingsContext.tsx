"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DrawingSettingsContextType {
  isArEnabled: boolean;
  setIsArEnabled: (value: boolean) => void;
  isGridEnabled: boolean;
  setIsGridEnabled: (value: boolean) => void;
  opacity: number;
  setOpacity: (value: number) => void;
}

export const DrawingSettingsContext = createContext<DrawingSettingsContextType | undefined>(undefined);

export function DrawingSettingsProvider({ children }: { children: ReactNode }) {
  const [isArEnabled, setIsArEnabled] = useState(false);
  const [isGridEnabled, setIsGridEnabled] = useState(true);
  const [opacity, setOpacity] = useState(1);

  return (
    <DrawingSettingsContext.Provider
      value={{
        isArEnabled,
        setIsArEnabled,
        isGridEnabled,
        setIsGridEnabled,
        opacity,
        setOpacity,
      }}
    >
      {children}
    </DrawingSettingsContext.Provider>
  );
}

export function useDrawingSettings() {
  const context = useContext(DrawingSettingsContext);
  if (context === undefined) {
    throw new Error("useDrawingSettings must be used within a DrawingSettingsProvider");
  }
  return context;
}
