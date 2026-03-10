export type QuestionType =
  | "single_select"
  | "multi_select"
  | "free_text"
  | "yes_no"
  | "rating"
  | "file_upload"
  | "date";

export type QuestionnaireStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "completed"
  | "expired";

export interface ConditionalLogic {
  if_question_id: string;
  operator: "equals" | "not_equals" | "contains";
  value: string;
}

export interface Questionnaire {
  id: string;
  token: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  intro_message: string | null;
  status: QuestionnaireStatus;
  expires_at: string | null;
  reminder_sent: boolean;
  completed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Question {
  id: string;
  questionnaire_id: string;
  sort_order: number;
  question_text: string;
  question_type: QuestionType;
  suggested_answers: string[] | null;
  conditional_logic: ConditionalLogic | null;
  required: boolean;
  created_at: string;
}

export interface Response {
  id: string;
  questionnaire_id: string;
  question_id: string;
  answer_text: string | null;
  selected_suggestions: string[] | null;
  file_url: string | null;
  answered_at: string;
}

export type AnswerMap = Record<
  string,
  { text?: string; selections?: string[]; fileUrl?: string }
>;
