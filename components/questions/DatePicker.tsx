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
        className="w-full rounded-xl border border-white/10 py-4 px-6 text-lg focus:outline-none focus:border-[#C5A572]/50 bg-white/5 text-white min-h-[56px] backdrop-blur-xl"
      />
      <button
        onClick={() => { if (date) onAnswer(date); }}
        disabled={!date}
        className="w-full py-4 rounded-xl bg-[#C5A572] text-[#0A0A0A] text-lg font-medium disabled:opacity-40 transition-all hover:bg-[#B87333]"
      >
        Continue
      </button>
    </motion.div>
  );
}
