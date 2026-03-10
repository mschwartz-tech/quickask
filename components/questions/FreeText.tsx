"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onAnswer: (value: string) => void;
  savedValue?: string;
}

export default function FreeText({ onAnswer, savedValue }: Props) {
  const [text, setText] = useState(savedValue || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 w-full"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full rounded-xl border border-gray-200 p-4 text-lg resize-none focus:outline-none focus:border-blue-400 min-h-[160px] bg-white text-[#1A1A1A]"
      />
      <button
        onClick={() => { if (text.trim()) onAnswer(text.trim()); }}
        disabled={!text.trim()}
        className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium disabled:opacity-40 transition-opacity"
      >
        Continue
      </button>
    </motion.div>
  );
}
