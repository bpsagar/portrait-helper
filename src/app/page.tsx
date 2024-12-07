"use client";

import DrawingReference from "@/components/DrawingReference";
import { useState, useEffect } from "react";

export default function Page() {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prevStep) => (prevStep >= 25 ? 1 : prevStep + 1));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-ivory min-h-screen">
      <div className="bg-box">
        <div className="bg-ivory-vignette">
          <div className="container max-w-2xl mx-auto text-center py-24 px-4">
            <h1 className="text-6xl font-medium tracking-tight">
              Yes, you can draw a <br />
              <span className="text-mint-green">portrait</span> too!
            </h1>

            <div className="flex gap-4 overflow-x-auto py-8 px-4 mt-2 items-center justify-center">
              <div className="max-w-[240px]">
                <DrawingReference
                  slug="messi"
                  stepNo={step}
                  options={{
                    grid: {
                      size: 70,
                      strokeSize: 0,
                      strokeColor: 1,
                    },
                  }}
                />
              </div>
            </div>

            <p className="text-xl text-slate-700 mt-10">
              We get it, portrait drawing techniques are complicated but they
              don't have to be. Our step-by-step guide helps you create
              realistic portrait drawings with ease.
            </p>

            <div className="mt-10">
              <a className="btn-primary" href="#">
                Get started
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
