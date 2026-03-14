"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import type { Questionnaire, Question, AnswerMap } from "../../../lib/types";
import SingleSelect from "../../../components/questions/SingleSelect";
import MultiSelect from "../../../components/questions/MultiSelect";
import FreeText from "../../../components/questions/FreeText";
import YesNo from "../../../components/questions/YesNo";
import Rating from "../../../components/questions/Rating";
import DatePicker from "../../../components/questions/DatePicker";
import FileUpload from "../../../components/questions/FileUpload";

type PageState =
  | "loading"
  | "error"
  | "expired"
  | "completed_already"
  | "intro"
  | "question"
  | "done";

const slideVariants = {
  enter: { x: "100%", opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } },
};

export default function QuestionnairePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = React.use(params);

  const [pageState, setPageState] = useState<PageState>("loading");
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const STORAGE_KEY = `quickask-${token}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch {}
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    async function load() {
      const { data: q, error } = await supabase
        .from("quickask_questionnaires")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !q) {
        setErrorMsg("This questionnaire does not exist.");
        setPageState("error");
        return;
      }

      if (q.status === "expired" || (q.expires_at && new Date(q.expires_at) < new Date())) {
        setPageState("expired");
        return;
      }

      if (q.status === "completed") {
        setPageState("completed_already");
        return;
      }

      const { data: qs, error: qsErr } = await supabase
        .from("quickask_questions")
        .select("*")
        .eq("questionnaire_id", q.id)
        .order("sort_order", { ascending: true });

      if (qsErr) {
        setErrorMsg("Failed to load questions. Please try again.");
        setNetworkError(true);
        setPageState("error");
        return;
      }

      setQuestionnaire(q);
      setQuestions(qs || []);
      setPageState("intro");
    }

    load();
  }, [token]);

  function shouldSkip(question: Question): boolean {
    if (!question.conditional_logic) return false;
    const { if_question_id, operator, value } = question.conditional_logic;
    const ans = answers[if_question_id];
    if (!ans) return true;

    const answerText = ans.text || ans.selections?.join(",") || "";

    switch (operator) {
      case "equals":
        return answerText !== value;
      case "not_equals":
        return answerText === value;
      case "contains":
        return !answerText.includes(value);
      default:
        return false;
    }
  }

  function getNextIdx(from: number): number | null {
    for (let i = from + 1; i < questions.length; i++) {
      if (!shouldSkip(questions[i])) return i;
    }
    return null;
  }

  function getVisibleIdx(from: number): number {
    for (let i = from; i < questions.length; i++) {
      if (!shouldSkip(questions[i])) return i;
    }
    return from;
  }

  const visibleQuestions = questions.filter((q) => !shouldSkip(q));
  const visibleCurrentIndex = visibleQuestions.findIndex(
    (q) => q.id === questions[currentIdx]?.id
  );
  const progress =
    visibleQuestions.length > 0
      ? ((visibleCurrentIndex + 1) / visibleQuestions.length) * 100
      : 0;

  const saveAnswer = useCallback(
    async (
      question: Question,
      answerText?: string,
      selections?: string[],
      fileUrl?: string
    ) => {
      if (!questionnaire) return;
      setSaving(true);

      const newAnswers = {
        ...answers,
        [question.id]: { text: answerText, selections, fileUrl },
      };
      setAnswers(newAnswers);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers));

      try {
        if (questionnaire.status === "pending" || questionnaire.status === "draft") {
          await supabase
            .from("quickask_questionnaires")
            .update({ status: "in_progress" })
            .eq("id", questionnaire.id);
          setQuestionnaire((q) => q ? { ...q, status: "in_progress" } : q);
        }

        await supabase.from("quickask_responses").upsert(
          {
            questionnaire_id: questionnaire.id,
            question_id: question.id,
            answer_text: answerText || null,
            selected_suggestions: selections || null,
            file_url: fileUrl || null,
            answered_at: new Date().toISOString(),
          },
          { onConflict: "questionnaire_id,question_id" }
        );

        setNetworkError(false);
      } catch {
        setNetworkError(true);
      } finally {
        setSaving(false);
      }
    },
    [questionnaire, answers, STORAGE_KEY]
  );

  async function handleAnswer(
    question: Question,
    answerText?: string,
    selections?: string[],
    fileUrl?: string
  ) {
    await saveAnswer(question, answerText, selections, fileUrl);

    const nextIdx = getNextIdx(currentIdx);
    if (nextIdx === null) {
      await markCompleted();
      // Notify completion
      try { fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); } catch {}
      setPageState("done");
    } else {
      setDirection(1);
      setCurrentIdx(nextIdx);
    }
  }

  async function handleSkip() {
    const nextIdx = getNextIdx(currentIdx);
    if (nextIdx === null) {
      await markCompleted();
      try { fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); } catch {}
      setPageState("done");
    } else {
      setDirection(1);
      setCurrentIdx(nextIdx);
    }
  }

  async function markCompleted() {
    if (!questionnaire) return;
    await supabase
      .from("quickask_questionnaires")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", questionnaire.id);
    localStorage.removeItem(STORAGE_KEY);
  }

  function startQuestionnaire() {
    const firstIdx = getVisibleIdx(0);
    setCurrentIdx(firstIdx);
    setPageState("question");
  }

  // ── Render states ──

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#C5A572] animate-spin" />
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <Screen>
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#C5A572]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">
            {networkError ? "Connection error" : "Not found"}
          </h1>
          <p className="text-white/50 text-base leading-relaxed">{errorMsg}</p>
          {networkError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-8 py-3 rounded-xl bg-[#C5A572] text-[#0A0A0A] font-medium hover:bg-[#B87333] transition-colors"
            >
              Try again
            </button>
          )}
        </div>
      </Screen>
    );
  }

  if (pageState === "expired") {
    return (
      <Screen>
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#C5A572]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">Link expired</h1>
          <p className="text-white/50 text-base leading-relaxed">
            This questionnaire has expired. Please contact us for a new link.
          </p>
        </div>
      </Screen>
    );
  }

  if (pageState === "completed_already") {
    return (
      <Screen>
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-[#C5A572]/30 bg-[#C5A572]/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-[#C5A572]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-white mb-2">Already submitted</h1>
          <p className="text-white/50 text-base leading-relaxed">
            You have already completed this questionnaire. Thank you.
          </p>
        </div>
      </Screen>
    );
  }

  if (pageState === "done") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen flex items-center justify-center bg-[#0A0A0A]"
      >
        <div className="text-center px-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full border border-[#C5A572]/30 bg-[#C5A572]/10 flex items-center justify-center"
          >
            <svg className="w-9 h-9 text-[#C5A572]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
          <h1 className="font-heading text-3xl font-semibold text-white mb-3">
            Thank you{questionnaire?.client_name ? `, ${questionnaire.client_name.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Your responses have been submitted. We appreciate your time.
          </p>
        </div>
      </motion.div>
    );
  }

  if (pageState === "intro" && questionnaire) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] px-6"
      >
        <div className="w-full max-w-md text-center">
          {questionnaire.client_name && (
            <p className="text-white/40 text-base mb-2 tracking-wide uppercase text-sm">
              Welcome, {questionnaire.client_name.split(" ")[0]}
            </p>
          )}
          <h1 className="font-heading text-3xl font-semibold text-white mb-4 leading-snug">
            {questionnaire.intro_message || "We have a few quick questions for you."}
          </h1>
          <p className="text-white/40 text-sm mb-10">
            {questions.length} question{questions.length !== 1 ? "s" : ""} &middot; Takes about a minute
          </p>
          <button
            onClick={startQuestionnaire}
            className="w-full py-4 rounded-xl bg-[#C5A572] text-[#0A0A0A] text-lg font-medium hover:bg-[#B87333] active:bg-[#A0622A] transition-colors"
          >
            Begin
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Question screen ──

  const question = questions[currentIdx];
  if (!question || !questionnaire) return null;

  const savedAns = answers[question.id];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-white/5 w-full">
        <motion.div
          className="h-full bg-[#C5A572] rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Network error banner */}
      {networkError && (
        <div className="bg-[#C5A572]/10 border-b border-[#C5A572]/20 px-4 py-2 text-[#C5A572] text-sm text-center">
          Answers saved locally. Retrying...
        </div>
      )}

      {/* Question area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1 flex flex-col px-6 pt-10 pb-8 max-w-md mx-auto w-full"
          >
            {/* Progress indicator */}
            <p className="text-white/30 text-sm mb-6 tracking-wider">
              {visibleCurrentIndex + 1} of {visibleQuestions.length}
            </p>

            {/* Question text */}
            <h2 className="font-heading text-2xl font-medium text-white leading-snug mb-8">
              {question.question_text}
            </h2>

            {/* Question input */}
            <div>
              {question.question_type === "single_select" && (
                <SingleSelect
                  suggested={question.suggested_answers || []}
                  onAnswer={(val) => handleAnswer(question, val, undefined, undefined)}
                  savedValue={savedAns?.text}
                />
              )}
              {question.question_type === "multi_select" && (
                <MultiSelect
                  suggested={question.suggested_answers || []}
                  onAnswer={(vals) => handleAnswer(question, vals.join(", "), vals, undefined)}
                  savedValue={savedAns?.selections}
                />
              )}
              {question.question_type === "free_text" && (
                <FreeText
                  onAnswer={(val) => handleAnswer(question, val, undefined, undefined)}
                  savedValue={savedAns?.text}
                />
              )}
              {question.question_type === "yes_no" && (
                <YesNo
                  onAnswer={(val) => handleAnswer(question, val, undefined, undefined)}
                  savedValue={savedAns?.text}
                />
              )}
              {question.question_type === "rating" && (
                <Rating
                  onAnswer={(val) => handleAnswer(question, val, undefined, undefined)}
                  savedValue={savedAns?.text}
                />
              )}
              {question.question_type === "date" && (
                <DatePicker
                  onAnswer={(val) => handleAnswer(question, val, undefined, undefined)}
                  savedValue={savedAns?.text}
                />
              )}
              {question.question_type === "file_upload" && (
                <FileUpload
                  questionnaireId={questionnaire.id}
                  questionId={question.id}
                  token={token}
                  onAnswer={(val) => handleAnswer(question, val, undefined, val)}
                />
              )}
            </div>

            {/* Saving indicator */}
            {saving && (
              <p className="text-center text-white/30 text-xs mt-4">Saving...</p>
            )}

            {/* Skip button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleSkip}
                disabled={saving}
                className="text-white/30 text-sm hover:text-white/60 transition-colors disabled:opacity-30 underline-offset-2 hover:underline"
              >
                Skip this question
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      {children}
    </div>
  );
}
