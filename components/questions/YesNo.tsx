"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onAnswer: (value: string) => void;
  savedValue?: string;
}

export default function YesNo({ onAnswer, savedValue }: Props) {
  const [selected, setSelected] = useState<string>(savedValue || "");

  function handle(val: string) {
    setSelected(val);
    setTimeout(() => onAnswer(val), 300);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 w-full"
    >
      {["Yes", "No"].map((opt) => (
        <button
          key={opt}
          onClick={() => handle(opt)}
          className={`w-full rounded-xl border py-5 text-xl font-medium transition-all duration-200 min-h-[64px] ${
            selected === opt
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-[#1A1A1A] hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          }`}
        >
          {opt}
        </button>
      ))}
    </motion.div>
  );
}
