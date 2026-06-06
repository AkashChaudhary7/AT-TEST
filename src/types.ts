/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceType: 'notes' | 'pyq' | 'current_affairs' | 'general';
  timesAnswered: number;
  timesCorrect: number;
  targetExam: string; // e.g. RAS MAINS, DSSSB TGT, RAJASTHAN GK, CURRENT AFFAIRS - GENERAL
  isFlagged?: boolean;
  isBookmarked?: boolean;
}

export interface SourceDocument {
  id: string;
  name: string;
  content: string;
  wordCount: number;
  uploadedAt: string;
  targetExam: string;
  docType?: 'notes' | 'pyq';
}

export interface HtmlMockTest {
  id: string;
  name: string;
  htmlContent: string;
  uploadedAt: string;
  targetExam: string;
}

export interface PracticeSession {
  id: string;
  examId: string; // Focus exam name
  sessionType: 'daily' | 'mock' | 'custom' | 'current_affairs';
  questionIds: string[];
  answers: Record<string, number>; // questionId -> selectedOptionIndex (0-3)
  score: number;
  totalQuestions: number;
  completedAt: string;
  accuracy: number; // percentage (0 to 100)
}

export interface PerformanceStats {
  totalQuestionsSolved: number;
  totalCorrect: number;
  overallAccuracy: number;
  streakCount: number;
  lastActiveDate: string; // YYYY-MM-DD
  subjectStats: Record<string, { solved: number; correct: number }>;
}

export interface MistakeBookItem {
  id: string;
  questionId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  selectedOptionIndex: number;
  explanation: string;
  subject: string;
  topic: string;
  userNotes?: string;
  timestamp: string;
  isFlagged: boolean;
  leitnerBox?: number; // 1 to 5
  lastReviewedAt?: string;
  nextReviewDate?: string;
}

export interface GeneratedPromptConfig {
  aiStyle: 'concise' | 'detailed' | 'socratic' | 'practical';
  difficultyAdaptive: boolean;
  systemPromptPreset: string;
  defaultNumOfQuestions: number;
}
