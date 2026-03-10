"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  suggested: string[];
  onAnswer: (values: string[]) => void;
  savedValue?: string[];
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function MultiSelect({ suggested, onAnswer, savedValue }: Props) {
  const [selected, setSelected] = useState<string[]>(savedValue || []);
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  const options = [...suggested, "Other"];

  function toggle(opt: string) {
    if (opt === "Other") {
      setShowOther((s) => !s);
      return;
    }
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  }

  function handleContinue() {
    const all = [...selected];
    if (showOther && otherText.trim()) all.push(otherText.trim());
    if (all.length > 0) onAnswer(all);
  }

  const hasSelection = selected.length > 0 || (showOther && otherText.trim().length > 0);

  return (
    <motion.div
      className="flex flex-col gap-3 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {options.map((opt) => {
        const isSelected = opt === "Other" ? showOther : selected.includes(opt);
        return (
          <motion.button
            key={opt}
            variants={itemVariants}
            onClick={() => toggle(opt)}
            className={`w-full text-left rounded-xl border py-4 px-6 text-lg transition-all duration-200 min-h-[56px] flex items-center gap-3 ${
              isSelected
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-gray-200 bg-white text-[#1A1A1A] hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
            }`}
          >
            <span
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
              }`}
            >
              {isSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {opt}
          </motion.button>
        );
      })}
      {showOther && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <textarea
            autoFocus
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-xl border border-gray-200 p-4 text-lg resize-none focus:outline-none focus:border-blue-400 min-h-[80px] bg-white"
          />
        </motion.div>
      )}
      <motion.button
        variants={itemVariants}
        onClick={handleContinue}
        disabled={!hasSelection}
        className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium disabled:opacity-40 transition-opacity mt-1"
      >
        Continue
      </motion.button>
    </motion.div>
  );
}
