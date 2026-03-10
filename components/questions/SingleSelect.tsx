"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  suggested: string[];
  onAnswer: (value: string) => void;
  savedValue?: string;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function SingleSelect({ suggested, onAnswer, savedValue }: Props) {
  const [selected, setSelected] = useState<string>(savedValue || "");
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState("");

  const options = [...suggested, "Other"];

  function handleSelect(opt: string) {
    if (opt === "Other") {
      setSelected("Other");
      setShowOther(true);
      return;
    }
    setShowOther(false);
    setSelected(opt);
    setTimeout(() => onAnswer(opt), 300);
  }

  function handleOtherSubmit() {
    if (otherText.trim()) {
      onAnswer(otherText.trim());
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-3 w-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {options.map((opt) => (
        <motion.button
          key={opt}
          variants={itemVariants}
          onClick={() => handleSelect(opt)}
          className={`w-full text-left rounded-xl border py-4 px-6 text-lg transition-all duration-200 min-h-[56px] ${
            selected === opt
              ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
              : "border-gray-200 bg-white text-[#1A1A1A] hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          }`}
        >
          {opt}
        </motion.button>
      ))}
      {showOther && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-2"
        >
          <textarea
            autoFocus
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-xl border border-gray-200 p-4 text-lg resize-none focus:outline-none focus:border-blue-400 min-h-[96px] bg-white"
          />
          <button
            onClick={handleOtherSubmit}
            disabled={!otherText.trim()}
            className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium disabled:opacity-40 transition-opacity"
          >
            Continue
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
