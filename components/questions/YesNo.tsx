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
          className={`w-full rounded-xl border py-5 text-xl font-medium transition-all duration-200 min-h-[64px] backdrop-blur-xl ${
            selected === opt
              ? "border-[#C5A572] bg-[#C5A572]/15 text-[#C5A572]"
              : "border-white/10 bg-white/5 text-white/80 hover:border-[#C5A572]/40 hover:bg-white/10 active:bg-white/15"
          }`}
        >
          {opt}
        </button>
      ))}
    </motion.div>
  );
}
