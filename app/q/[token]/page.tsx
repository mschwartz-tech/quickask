"use client";

import { useEffect, useState, useCallback } from "react";
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
  params: { token: string };
}) {
  const { token } = params;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [networkError, setNetworkError] = useState(false);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  // Load answers from localStorage backup
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

  // Evaluate conditional logic
  function shouldSkip(question: Question): boolean {
    if (!question.conditional_logic) return false;
    const { if_question_id, operator, value } = question.conditional_logic;
    const ans = answers[if_question_id];
    if (!ans) return true; // condition question not answered, skip

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

  // Get the next visible question index from a given index
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

  // Count visible questions for progress
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

      // Update local state + localStorage backup
      const newAnswers = {
        ...answers,
        [question.id]: { text: answerText, selections, fileUrl },
      };
      setAnswers(newAnswers);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAnswers));

      try {
        // Mark in_progress on first answer
        if (questionnaire.status === "pending" || questionnaire.status === "draft") {
          await supabase
            .from("quickask_questionnaires")
            .update({ status: "in_progress" })
            .eq("id", questionnaire.id);
          setQuestionnaire((q) => q ? { ...q, status: "in_progress" } : q);
        }

        // Upsert response
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
      // All done
      await markCompleted();
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

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <Screen>
        <div className="text-center px-6">
          <p className="text-5xl mb-6">🔍</p>
          <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">
            {networkError ? "Connection error" : "Not found"}
          </h1>
          <p className="text-[#666] text-base leading-relaxed">{errorMsg}</p>
          {networkError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 rounded-xl bg-[#1A1A1A] text-white font-medium"
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
          <p className="text-5xl mb-6">⏰</p>
          <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">Link expired</h1>
          <p className="text-[#666] text-base leading-relaxed">
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
          <p className="text-5xl mb-6">✅</p>
          <h1 className="text-xl font-semibold text-[#1A1A1A] mb-2">Already submitted</h1>
          <p className="text-[#666] text-base leading-relaxed">
            You have already completed this questionnaire. Thank you!
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
        className="min-h-screen flex items-center justify-center bg-[#FAFAFA]"
      >
        <div className="text-center px-6">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-6xl mb-6"
          >
            🙌
          </motion.p>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-3">
            Thank you{questionnaire?.client_name ? `, ${questionnaire.client_name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-[#666] text-base leading-relaxed">
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
        className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6"
      >
        <div className="w-full max-w-md text-center">
          {questionnaire.client_name && (
            <p className="text-[#666] text-base mb-2">
              Hi, {questionnaire.client_name.split(" ")[0]} 👋
            </p>
          )}
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-4 leading-snug">
            {questionnaire.intro_message || "We have a few quick questions for you."}
          </h1>
          <p className="text-[#666] text-sm mb-10">
            {questions.length} question{questions.length !== 1 ? "s" : ""} · Takes about a minute
          </p>
          <button
            onClick={startQuestionnaire}
            className="w-full py-4 rounded-xl bg-[#1A1A1A] text-white text-lg font-medium hover:bg-[#2a2a2a] active:bg-[#333] transition-colors"
          >
            Let&apos;s Begin
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────

  const question = questions[currentIdx];
  if (!question || !questionnaire) return null;

  const savedAns = answers[question.id];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 w-full">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Network error banner */}
      {networkError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-700 text-sm text-center">
          Answers saved locally. Retrying...
        </div>
      )}

      {/* Question area */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <p className="text-[#999] text-sm mb-6">
              {visibleCurrentIndex + 1} of {visibleQuestions.length}
            </p>

            {/* Question text */}
            <h2 className="text-2xl font-medium text-[#1A1A1A] leading-snug mb-8">
              {question.question_text}
            </h2>

            {/* Question input */}
            <div className="flex-1">
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
                  onAnswer={(val) => handleAnswer(question, val, undefined, val)}
                />
              )}
            </div>

            {/* Saving indicator */}
            {saving && (
              <p className="text-center text-[#999] text-xs mt-4">Saving...</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      {children}
    </div>
  );
}
