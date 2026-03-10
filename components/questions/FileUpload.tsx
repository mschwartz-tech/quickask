"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Props {
  questionnaireId: string;
  questionId: string;
  onAnswer: (value: string) => void;
}

export default function FileUpload({ questionnaireId, questionId, onAnswer }: Props) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [fileUrl, setFileUrl] = useState("");

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setError("");
      setUploading(true);
      try {
        const path = `${questionnaireId}/${questionId}/${Date.now()}-${f.name}`;
        const { error: uploadError } = await supabase.storage
          .from("quickask-uploads")
          .upload(path, f);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage
          .from("quickask-uploads")
          .getPublicUrl(path);
        setFileUrl(data.publicUrl);
        setUploaded(true);
      } catch {
        setError("Upload failed. You can still continue.");
      } finally {
        setUploading(false);
      }
    },
    [questionnaireId, questionId]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handleContinue() {
    onAnswer(fileUrl || file?.name || "uploaded");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 w-full"
    >
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 px-6 cursor-pointer transition-all ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <input type="file" className="sr-only" onChange={onInputChange} />
        {file ? (
          <div className="text-center">
            <p className="text-[#1A1A1A] font-medium">{file.name}</p>
            {uploading && <p className="text-[#666] text-sm mt-1">Uploading...</p>}
            {uploaded && <p className="text-emerald-600 text-sm mt-1">Uploaded</p>}
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-[#666]">Tap to choose a file</p>
            <p className="text-[#999] text-sm mt-1">or drag and drop</p>
          </div>
        )}
      </label>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <button
        onClick={handleContinue}
        disabled={!file || uploading}
        className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium disabled:opacity-40 transition-opacity"
      >
        {uploading ? "Uploading..." : "Continue"}
      </button>
    </motion.div>
  );
}
