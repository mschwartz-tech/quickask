"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onAnswer: (value: string) => void;
  savedValue?: string;
}

export default function DatePicker({ onAnswer, savedValue }: Props) {
  const [date, setDate] = useState(savedValue || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 w-full"
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-xl border border-gray-200 py-4 px-6 text-lg focus:outline-none focus:border-blue-400 bg-white text-[#1A1A1A] min-h-[56px]"
      />
      <button
        onClick={() => { if (date) onAnswer(date); }}
        disabled={!date}
        className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium disabled:opacity-40 transition-opacity"
      >
        Continue
      </button>
    </motion.div>
  );
}
