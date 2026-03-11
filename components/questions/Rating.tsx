"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onAnswer: (value: string) => void;
  savedValue?: string;
}

export default function Rating({ onAnswer, savedValue }: Props) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(savedValue ? parseInt(savedValue) : 0);

  function handle(val: number) {
    setSelected(val);
    setTimeout(() => onAnswer(String(val)), 300);
  }

  const display = hovered || selected;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-6 w-full"
    >
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => handle(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform active:scale-90"
          >
            <svg
              className={`w-12 h-12 transition-colors duration-150 ${
                n <= display ? "text-[#C5A572]" : "text-white/15"
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
      {display > 0 && (
        <p className="text-white/40 text-sm">
          {display === 1 && "Poor"}
          {display === 2 && "Fair"}
          {display === 3 && "Good"}
          {display === 4 && "Very good"}
          {display === 5 && "Excellent"}
        </p>
      )}
    </motion.div>
  );
}
