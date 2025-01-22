"use client";

import Accordion from "@/components/Accordion";
import DrawingReference from "@/components/DrawingReference";
import LogoWithTitle from "@/components/LogoWithTitle";
import { useState, useEffect } from "react";

export default function Page() {
  const [step, setStep] = useState(1);
  const focusArea = [
    "Break the portrait down into smaller sections with a grid. This ensures you minimize irreversible mistakes that ruin hours of effort.",
    "We give you hyper-focused suggestions, helping you get the proportions and alignment right for your drawing.",
  ];
  const findTheShade = [
    "Capturing the shades well is key to creating depth and bringing the portrait alive.",
    "Perceiving the right shade takes time. We help isolate and show them to you progressively, making it easier for an untrained eye.",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prevStep) => (prevStep >= 25 ? 1 : prevStep + 1));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-ivory min-h-screen">
      <div className="bg-ivory container mx-auto px-4 py-4 flex items-center justify-center">
        <LogoWithTitle />
      </div>
      <section className="bg-box">
        <div className="bg-ivory-vignette">
          <div className="container max-w-2xl mx-auto text-center pb-24">
            <h1 className="text-6xl font-medium tracking-tight">
              <span className="text-sm text-slate-500 font-sans uppercase tracking-[0]">
                Get started with portrait drawing:{" "}
              </span>
              <br />
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
      </section>
      <section className="bg-white py-16">
        <div className="container max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10 px-6">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl font-medium">
              Feeling stuck with portrait drawing?
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-slate-700">
              Portrait drawing can seem daunting, with all the talk of anatomy
              and proportions. You're not alone. Many budding artists feel this
              way, doubting their skills even before they put pencil to paper.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-ivory-vignette py-24">
        <div className="container max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-medium text-center mb-10">
            Take the easy route
          </h2>
          <p className="text-lg text-slate-700 text-left mb-4">
            But don't worry—there's no need to feel pressured to follow complex,
            'pure' artistic methods.
          </p>
          <p className="text-lg text-slate-700 text-left">
            You deserve to enjoy the process and be proud of your work.
          </p>
        </div>
      </section>
      <section className="bg-ivory-vignette py-16">
        <div className="container max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10 px-6">
          <div className="flex-1">
            <Accordion
              title="Focus on one area at a time"
              description={focusArea}
            />
            <Accordion
              title="Find the right shade"
              description={findTheShade}
            />
          </div>
          <div className="flex-1">
            <img src="/references/messi_dark.png" alt="messi image" />
          </div>
        </div>
      </section>
      <section className="bg-ivory-vignette py-24">
        <div className="container max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-medium text-center mb-10">
            Our philosophy
          </h2>
          <p className="text-lg text-slate-700 text-left mb-4">
            We believe everyone deserves to feel accomplished in their artistic
            journey. We understand the frustration when a portrait doesn't turn
            out right, and the defeat after investing so much time and energy.
          </p>
          <p className="text-lg text-slate-700 text-left">
            We've been there, and we've found a better approach to portrait
            sketching, free from the pressure of "proper" techniques. Now, we
            want to help you feel proud of your completed drawings.
          </p>
        </div>
      </section>
      <section className="bg-box">
        <div className="bg-green-vignette py-24">
          <div className="container max-w-2xl mx-auto px-6">
            <h2 className="text-4xl text-center font-medium mb-10">
              Eliminate the guesswork
            </h2>
            <p className="text-lg text-slate-700 text-left mb-10">
              Spend less time on technical struggles and focus more on the fun
              aspects of portrait drawing. See tangible improvements in your
              work and motivation to continue creating.
            </p>
            <div className="text-center">
              <a className="btn-primary" href="#get-started">
                Start here
              </a>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-ivory-vignette py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <div className="mx-auto flex items-center">
              <LogoWithTitle />
            </div>
            <p className="max-w-[422px] text-lg text-slate-700 text-left mt-4">
              Portrait Coach offers easy step-by-step guides for portrait
              drawing, making the process simple and approachable for amateur
              artists.
            </p>
          </div>
        </div>
      </section>
      <footer className="bg-footer-black">
        <div className="container mx-auto px-4 py-4">
          <p className="text-lg text-white text-center">
            Privacy | Terms | Copyright © 2024 Rad Radium Pte. Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
}
