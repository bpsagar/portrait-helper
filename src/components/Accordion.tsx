import React, { useState } from "react";

type AccordionProps = {
  title: string;
  description: Array<string>;
};

const Accordion: React.FC<AccordionProps> = ({ title, description }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="container">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={toggleAccordion}
      >
        <h2 className="text-2xl font-medium">{title}</h2>
        <span className="text-black">
          {isOpen ? (
            <img
              className="h-[25px] w-auto"
              src="/references/chevron-down.png"
              alt="down"
            />
          ) : (
            <img
              className="h-[25px] w-auto"
              src="/references/chevron-up.png"
              alt="up"
            />
          )}
        </span>
      </div>
      {isOpen && (
        <div className="p-4">
          {description.map((desc, index) => (
            <p className="text-lg text-slate-700 mb-4" key={index}>
              {desc}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default Accordion;
