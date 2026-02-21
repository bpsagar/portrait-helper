"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DrawingSettingsContextType {
  isArEnabled: boolean;
  setIsArEnabled: (value: boolean) => void;
  isColorModeEnabled: boolean;
  setIsColorModeEnabled: (value: boolean) => void;
  opacity: number;
  setOpacity: (value: number) => void;
}

export const DrawingSettingsContext = createContext<DrawingSettingsContextType | undefined>(undefined);

export function DrawingSettingsProvider({ children }: { children: ReactNode }) {
  const [isArEnabled, setIsArEnabled] = useState(false);
  const [isColorModeEnabled, setIsColorModeEnabled] = useState(false);
  const [opacity, setOpacity] = useState(1);

  return (
    <DrawingSettingsContext.Provider
      value={{
        isArEnabled,
        setIsArEnabled,
        isColorModeEnabled,
        setIsColorModeEnabled,
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
