/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Question, PerformanceStats, PracticeSession, MistakeBookItem } from "../types";
import { setItem } from "../lib/db";
import { saveQuestionToFirestore } from "../lib/firebaseService";
import { CircularProgressBar } from "./CircularProgressBar";
import {
  Brain,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Database,
  ArrowRight,
  Zap,
  RefreshCw,
  Sliders,
  Check,
  Flame,
  BookOpen,
  Target,
  Flag,
  Bookmark
} from "lucide-react";

interface PracticeInterfaceProps {
  activeExam: string;
  questions: Question[];
  stats: PerformanceStats;
  setStats: (stats: PerformanceStats) => void;
  sessions: PracticeSession[];
  setSessions: (sessions: PracticeSession[]) => void;
  mistakeItems: MistakeBookItem[];
  setMistakeItems: (items: MistakeBookItem[]) => void;
  exams?: any[];
}

export default function PracticeInterface({
  activeExam,
  questions,
  stats,
  setStats,
  sessions,
  setSessions,
  mistakeItems,
  setMistakeItems,
  exams = []
}: PracticeInterfaceProps) {
  // Session states
  const [sessionState, setSessionState] = useState<"setup" | "active" | "results">("setup");
  const [sessionType, setSessionType] = useState<"daily" | "mock" | "custom" | "current_affairs">("custom");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [useAdaptiveTuning, setUseAdaptiveTuning] = useState(true);
  const [useSpacedRepetion, setUseSpacedRepetion] = useState(true);
  const [caTopicKeyword, setCaTopicKeyword] = useState("National Tech Policies");
  const [isGeneratingCA, setIsGeneratingCA] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [mockTimeRemaining, setMockTimeRemaining] = useState<number | null>(null);

  // Subject and Topic Drilling State parameters
  const [drillScope, setDrillScope] = useState<"all" | "subject" | "ai">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [aiFilterQuery, setAiFilterQuery] = useState<string>("");
  const [aiIsFiltering, setAiIsFiltering] = useState<boolean>(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[]>([]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs + ":" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Live Timer effect for full timed Mock exams
  useEffect(() => {
    if (sessionState !== "active" || mockTimeRemaining === null) return;
    if (mockTimeRemaining <= 0) {
      // Countdown complete, auto-submit exam answers
      alert("⏱️ Times up! Your examination period has lapsed. Submitting mock test elements now.");
      handleFinishSession();
      return;
    }

    const interval = setInterval(() => {
      setMockTimeRemaining(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionState, mockTimeRemaining]);

  // Active state parameters
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({}); // qId -> selectedIndex
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState("");

  // Auto-Save Draft recovery states (Enhancement 5)
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [savedDraftData, setSavedDraftData] = useState<any>(null);

  // Scan for current target exam's unfinished practice drafts
  useEffect(() => {
    const raw = localStorage.getItem("target_active_practice_draft");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.activeExam === activeExam && parsed.activeQuestions && parsed.activeQuestions.length > 0) {
          setSavedDraftData(parsed);
          setHasSavedDraft(true);
          return;
        }
      } catch (e) {
        console.warn("Corrupted quiz draft bypassed:", e);
      }
    }
    setHasSavedDraft(false);
    setSavedDraftData(null);
  }, [activeExam]);

  // Periodic Auto-Save: caches layout structures and answers to prevent lost work
  useEffect(() => {
    if (sessionState === "active" && activeQuestions.length > 0) {
      const draft = {
        activeExam,
        activeQuestions,
        currentIndex,
        userAnswers,
        sessionStartTime,
        currentSessionId,
        sessionType,
        mockTimeRemaining,
        savedAt: Date.now()
      };
      localStorage.setItem("target_active_practice_draft", JSON.stringify(draft));
      setItem("target_active_practice_draft", draft).catch(console.error);
    }
  }, [sessionState, activeQuestions, currentIndex, userAnswers, mockTimeRemaining, sessionStartTime, currentSessionId, sessionType, activeExam]);

  const handleResumeDraft = () => {
    if (!savedDraftData) return;
    setActiveQuestions(savedDraftData.activeQuestions);
    setCurrentIndex(savedDraftData.currentIndex);
    setUserAnswers(savedDraftData.userAnswers);
    setSessionStartTime(savedDraftData.sessionStartTime || Date.now());
    setCurrentSessionId(savedDraftData.currentSessionId || "sess-" + Date.now());
    setSessionType(savedDraftData.sessionType || "custom");
    if (savedDraftData.mockTimeRemaining !== undefined) {
      setMockTimeRemaining(savedDraftData.mockTimeRemaining);
    }
    setSessionState("active");
    setHasSavedDraft(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("target_active_practice_draft");
    setHasSavedDraft(false);
    setSavedDraftData(null);
  };

  // AI Topic Insights and Academic Summarize parameters
  const [isFetchingInsights, setIsFetchingInsights] = useState(false);
  const [activeInsights, setActiveInsights] = useState<Record<string, string>>({});

  // Adaptive tuning logic displays
  const getAdaptiveProfile = () => {
    const acc = stats.overallAccuracy;
    const count = stats.totalQuestionsSolved;
    if (count === 0) return { mode: "Balanced Base", desc: "Equal distribution. Analyzing initial learning curve.", tag: "Normal" };
    if (acc >= 75) return { mode: "Elite Challenge Mode", desc: "Accuracy is high (≥75%). Prioritizing Medium & Hard questions to push cognitive limits.", tag: "Hard Focus" };
    if (acc < 50) return { mode: "Confidence restoration", desc: "Accuracy is dropping (<50%). Auto-shuffling Easy questions to restore foundational structure.", tag: "Easy Focus" };
    return { mode: "Standard Adaptive", desc: "Steady progress. Shuffling a balanced mix of Easy, Medium, and Hard challenges.", tag: "Normal" };
  };

  const uniqueSubjectsForExam = Array.from(
    new Set(questions.filter(q => q.targetExam === activeExam).map(q => q.subject))
  ).filter(Boolean) as string[];

  const uniqueTopicsForExam = Array.from(
    new Set(
      questions
        .filter(q => q.targetExam === activeExam && (!selectedSubject || q.subject === selectedSubject))
        .map(q => q.topic)
    )
  ).filter(Boolean) as string[];

  const handleAIFilter = async () => {
    if (!aiFilterQuery.trim()) {
      setAiMatchedIds([]);
      return;
    }
    setAiIsFiltering(true);
    try {
      const activeExamPool = questions.filter(q => q.targetExam === activeExam);
      const questionsSummary = activeExamPool.map(q => ({
        id: q.id,
        subject: q.subject,
        topic: q.topic,
        question: q.question.substring(0, 90)
      }));

      const res = await fetch("/api/ai-filter-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: aiFilterQuery,
          questionsSummary
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.matchedIds) && data.matchedIds.length > 0) {
        setAiMatchedIds(data.matchedIds);
      } else {
        // Fallback: Local regex
        const term = aiFilterQuery.toLowerCase();
        const matches = activeExamPool.filter(q => 
          (q.subject && q.subject.toLowerCase().includes(term)) ||
          (q.topic && q.topic.toLowerCase().includes(term)) ||
          q.question.toLowerCase().includes(term)
        ).map(q => q.id);
        setAiMatchedIds(matches);
      }
    } catch (err) {
      console.error("AI matching fallback error:", err);
      const term = aiFilterQuery.toLowerCase();
      const matches = questions.filter(q => 
        q.targetExam === activeExam &&
        ((q.subject && q.subject.toLowerCase().includes(term)) ||
        (q.topic && q.topic.toLowerCase().includes(term)) ||
        q.question.toLowerCase().includes(term))
      ).map(q => q.id);
      setAiMatchedIds(matches);
    } finally {
      setAiIsFiltering(false);
    }
  };

  const adProfile = getAdaptiveProfile();

  // Initializing active session pool based on user filters & adaptive constraints
  const handleLaunchSession = async () => {
    setIsGeneratingCA(true);
    let selectedQuestions: Question[] = [];

    // Find active exam specifications inside system
    const examObj = exams.find(e => e.name === activeExam);
    let actualNumQuestions = numQuestions;

    if (sessionType === "mock") {
      actualNumQuestions = examObj?.mockQuestionCount || 50;
      const mockMins = examObj?.mockDurationMinutes || 120;
      setMockTimeRemaining(mockMins * 60);
    } else {
      setMockTimeRemaining(null);
    }

    // Step A: Check if Current Affairs generator via Backend is selected
    if (sessionType === "current_affairs" && !offlineMode) {
      try {
        const response = await fetch("/api/generate-current-affairs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numQuestions: actualNumQuestions,
            customTopic: caTopicKeyword,
            activeFocusExam: activeExam
          })
        });
        const data = await response.json();
        if (data.success && data.questions && data.questions.length > 0) {
          selectedQuestions = data.questions;
        } else {
          throw new Error("Generative API did not return questions.");
        }
      } catch (err) {
        console.warn("Express backend call stalled or offline. Falling back to local questions pool.");
        // local query fallback
        selectedQuestions = questions.filter(q => q.sourceType === "current_affairs" || q.targetExam === activeExam);
      }
    } else {
      // Step B: Build from local pool matching active exam target
      let examPool = questions.filter(q => q.targetExam === activeExam);
      
      if (examPool.length === 0) {
        examPool = [...questions];
      }

      // Apply drill filters
      if (drillScope === "subject") {
        if (selectedSubject) {
          examPool = examPool.filter(q => q.subject === selectedSubject);
        }
        if (selectedTopic) {
          examPool = examPool.filter(q => q.topic === selectedTopic);
        }
      } else if (drillScope === "ai") {
        if (aiMatchedIds.length > 0) {
          examPool = examPool.filter(q => aiMatchedIds.includes(q.id));
        } else if (aiFilterQuery.trim()) {
          const term = aiFilterQuery.toLowerCase();
          examPool = examPool.filter(q => 
            (q.subject && q.subject.toLowerCase().includes(term)) ||
            (q.topic && q.topic.toLowerCase().includes(term)) ||
            q.question.toLowerCase().includes(term)
          );
        }
      }

      // Step C: Spaced Repetition Mistake Re-injection (inject wrong items)
      let injectedMistakes: Question[] = [];
      if (useSpacedRepetion && mistakeItems.length > 0) {
        const wrongQs = questions.filter(q => mistakeItems.some(m => m.questionId === q.id));
        injectedMistakes = wrongQs.filter(q => q.targetExam === activeExam).slice(0, Math.floor(actualNumQuestions / 2));
        if (injectedMistakes.length === 0) {
          injectedMistakes = wrongQs.slice(0, Math.floor(actualNumQuestions / 2));
        }
      }

      // Step D: Apply Adaptive Tuning criteria (filter by difficulty)
      let candidates = examPool.filter(q => !injectedMistakes.some(m => m.id === q.id));
      if (useAdaptiveTuning && stats.totalQuestionsSolved > 0) {
        const acc = stats.overallAccuracy;
        if (acc >= 75) {
          // Prioritize Hard and Medium
          const preferred = candidates.filter(q => q.difficulty === "hard" || q.difficulty === "medium");
          candidates = preferred.length >= 2 ? preferred : candidates;
        } else if (acc < 50) {
          // Prioritize Easy and Medium
          const preferred = candidates.filter(q => q.difficulty === "easy" || q.difficulty === "medium");
          candidates = preferred.length >= 2 ? preferred : candidates;
        }
      }

      // Shuffle candidate list
      const shuffledCandidates = [...candidates].sort(() => 0.5 - Math.random());
      
      // Combine injected mistakes and remaining candidates
      selectedQuestions = [...injectedMistakes, ...shuffledCandidates].slice(0, actualNumQuestions);
    }

    if (selectedQuestions.length === 0) {
      // absolute safe fallback
      selectedQuestions = questions.slice(0, actualNumQuestions);
    }

    setActiveQuestions(selectedQuestions);
    setCurrentIndex(0);
    setUserAnswers({});
    setSessionStartTime(Date.now());
    setCurrentSessionId("sess-" + Date.now());
    localStorage.removeItem("target_active_practice_draft");
    setSessionState("active");
    setIsGeneratingCA(false);
  };

  const handleSelectOption = (qId: string, optionIndex: number) => {
    // Only allow selection once per question in live feedback mode
    if (userAnswers[qId] !== undefined) return;
    
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionIndex
    }));
  };

  const toggleFlag = async (qId: string) => {
    const q = activeQuestions.find(q => q.id === qId);
    if (!q) return;
    const updatedQ = { ...q, isFlagged: !q.isFlagged };
    setActiveQuestions(prev => prev.map(item => item.id === qId ? updatedQ : item));
    await saveQuestionToFirestore(updatedQ);
  };
  
  const toggleBookmark = async (qId: string) => {
    const q = activeQuestions.find(q => q.id === qId);
    if (!q) return;
    const updatedQ = { ...q, isBookmarked: !q.isBookmarked };
    setActiveQuestions(prev => prev.map(item => item.id === qId ? updatedQ : item));
    await saveQuestionToFirestore(updatedQ);
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleFinishSession = () => {
    // Calculate outcome score
    let correctCount = 0;
    const sessionDetailsMistakes: MistakeBookItem[] = [];

    activeQuestions.forEach(q => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correctOptionIndex;
      
      if (isCorrect) {
        correctCount++;
        q.timesCorrect++;
      } else {
        // Log to mistake items list if user choose selected
        if (selected !== undefined) {
          const newMistake: MistakeBookItem = {
            id: "mistake-" + Date.now() + "-" + Math.random().toString(36).substring(4),
            questionId: q.id,
            questionText: q.question,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            selectedOptionIndex: selected,
            explanation: q.explanation,
            subject: q.subject,
            topic: q.topic,
            timestamp: new Date().toISOString(),
            isFlagged: false
          };
          sessionDetailsMistakes.push(newMistake);
        }
      }
      q.timesAnswered++;
    });

    const accuracyVal = activeQuestions.length > 0 ? Math.round((correctCount / activeQuestions.length) * 100) : 0;

    // Create session record
    const newSession: PracticeSession = {
      id: currentSessionId,
      examId: activeExam,
      sessionType: sessionType,
      questionIds: activeQuestions.map(q => q.id),
      answers: userAnswers,
      score: correctCount,
      totalQuestions: activeQuestions.length,
      completedAt: new Date().toISOString(),
      accuracy: accuracyVal
    };

    // Update sessions
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    localStorage.setItem("practice_sessions", JSON.stringify(updatedSessions));

    // Update mistake list
    const filteredOldMistakes = mistakeItems.filter(m => !activeQuestions.some(q => q.id === m.questionId && userAnswers[q.id] === q.correctOptionIndex));
    const mergedMistakes = [...sessionDetailsMistakes, ...filteredOldMistakes];
    setMistakeItems(mergedMistakes);
    localStorage.setItem("mistake_book", JSON.stringify(mergedMistakes));

    // Update global Performance Stats
    const solvedToday = activeQuestions.length;
    let oldSolved = stats.totalQuestionsSolved;
    let oldCorrect = stats.totalCorrect;

    let newTotalSolved = oldSolved + solvedToday;
    let newTotalCorrect = oldCorrect + correctCount;
    let newAccuracy = newTotalSolved > 0 ? Math.round((newTotalCorrect / newTotalSolved) * 100) : 0;

    // Calculate streak
    const todayStr = new Date().toISOString().split("T")[0];
    let newStreak = stats.streakCount;
    if (stats.lastActiveDate === todayStr) {
      // already practiced today, keep streak
    } else {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      if (stats.lastActiveDate === yesterday || !stats.lastActiveDate) {
        newStreak = (stats.streakCount || 0) + 1;
      } else {
        newStreak = 1; // broken, reset to 1
      }
    }

    // Update subject stats
    const updatedSubjectStats = { ...stats.subjectStats };
    activeQuestions.forEach(q => {
      const isCorrect = userAnswers[q.id] === q.correctOptionIndex;
      if (!updatedSubjectStats[q.subject]) {
        updatedSubjectStats[q.subject] = { solved: 0, correct: 0 };
      }
      updatedSubjectStats[q.subject].solved++;
      if (isCorrect) {
        updatedSubjectStats[q.subject].correct++;
      }
    });

    const updatedStats: PerformanceStats = {
      totalQuestionsSolved: newTotalSolved,
      totalCorrect: newTotalCorrect,
      overallAccuracy: newAccuracy,
      streakCount: newStreak,
      lastActiveDate: todayStr,
      subjectStats: updatedSubjectStats
    };

    setStats(updatedStats);
    localStorage.setItem("performance_stats", JSON.stringify(updatedStats));
    localStorage.removeItem("target_active_practice_draft");

    // Trigger state change
    setSessionState("results");
  };

  const handleFetchInsights = async (q: Question) => {
    if (activeInsights[q.id]) return; // already loaded
    
    setIsFetchingInsights(true);
    try {
      const selectedIdx = userAnswers[q.id];
      const selectedText = selectedIdx !== undefined ? q.options[selectedIdx] : "None";
      
      const response = await fetch("/api/get-topic-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: q.question,
          selectedOptionText: selectedText,
          correctOptionText: q.options[q.correctOptionIndex],
          explanation: q.explanation,
          subject: q.subject,
          topic: q.topic,
          subtopic: q.subtopic
        })
      });
      
      const data = await response.json();
      if (data.success && data.insights) {
        setActiveInsights(prev => ({
          ...prev,
          [q.id]: data.insights
        }));
      } else {
        alert("Failed to fetch live insights.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error fetching academic topic insights: " + err.message);
    } finally {
      setIsFetchingInsights(false);
    }
  };

  function parseBoldText(text: string) {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-slate-100">{part}</strong>;
      }
      return part;
    });
  }

  function renderFancyMarkdown(text: string) {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-2 mt-4 text-slate-300 text-xs leading-relaxed font-sans border-t border-slate-800 pt-4">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("###")) {
            return (
              <h4 key={idx} className="text-sm font-extrabold text-indigo-400 mt-4 mb-2 font-mono">
                {trimmed.substring(3).trim()}
              </h4>
            );
          }
          if (trimmed.startsWith("####")) {
            return (
              <h5 key={idx} className="text-xs font-bold text-slate-200 mt-3 mb-1 uppercase font-mono">
                {trimmed.substring(4).trim()}
              </h5>
            );
          }
          if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            return (
              <div key={idx} className="flex gap-2 items-start pl-4 my-1">
                <span className="text-indigo-400 font-bold">•</span>
                <span className="flex-1">{parseBoldText(trimmed.substring(1).trim())}</span>
              </div>
            );
          }
          if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
            return (
              <p key={idx} className="text-slate-250 font-bold pl-2 my-2">
                {parseBoldText(trimmed)}
              </p>
            );
          }
          if (trimmed.length === 0) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx}>{parseBoldText(trimmed)}</p>;
        })}
      </div>
    );
  }

  const activeQ = activeQuestions[currentIndex];
  const hasAnsweredCurrent = activeQ && userAnswers[activeQ.id] !== undefined;

  const activeExamPool = questions.filter(q => q.targetExam === activeExam);
  const availableCount = activeExamPool.length;

  const liveAccuracy = stats.totalQuestionsSolved > 0
    ? Math.round((stats.totalCorrect / stats.totalQuestionsSolved) * 100)
    : stats.overallAccuracy;

  // Track highest streak
  const highestStreakSaved = localStorage.getItem("highestStreak_" + activeExam) || "3";
  const highestStreakVal = Math.max(stats.streakCount || 0, parseInt(highestStreakSaved, 10));
  if (stats.streakCount > parseInt(highestStreakSaved, 10)) {
    localStorage.setItem("highestStreak_" + activeExam, stats.streakCount.toString());
  }

  return (
    <div className="space-y-6 animate-fade-in" id="practice-arena-component">
      
      {sessionState === "setup" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-6" id="practice-config-panel">
          
          {/* Minimized Header & Dynamic Available Questions Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Target size={18} />
              </div>
              <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">Practice Arena</h3>
                    <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-widest leading-none">{activeExam}</span>
                  </div>
                  <CircularProgressBar progress={stats.totalQuestionsSolved / (availableCount || 1) * 100} size={40} strokeWidth={4} />
              </div>
            </div>

            {/* Day Counter element strictly between Practice Arena and Available Count */}
            {(() => {
              const matchedExam = exams?.find(e => e.name === activeExam);
              if (!matchedExam || !matchedExam.targetDate) return null;
              const diff = +new Date(matchedExam.targetDate) - +new Date();
              const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
              return (
                <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition group select-none cursor-default" id="practice-day-counter">
                  <Clock size={12} className="text-amber-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-black tracking-widest text-slate-500 uppercase">COUNTDOWN:</span>
                  <span className="text-[10px] font-mono font-black tracking-tight text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {days === 0 ? "EXAM TODAY!" : `${days} DAYS REMAINING`}
                  </span>
                </div>
              );
            })()}

            <div className="bg-indigo-500/10 text-indigo-455 border border-indigo-500/25 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider">
              📚 {availableCount} Questions Available
            </div>
          </div>

          {hasSavedDraft && savedDraftData && (
            <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in shadow-xl select-none" id="draft-recovery-bar">
              <div className="space-y-1.5 text-left">
                <span className="bg-amber-400 text-slate-950 font-bold font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 w-max">
                  <Zap size={10} strokeWidth={3} /> Interrupted Session Detected
                </span>
                <h4 className="text-xs font-black text-slate-150 font-sans tracking-tight">
                  Would you like to resume your outstanding practice of {savedDraftData.activeQuestions?.length} Questions?
                </h4>
                <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                  Saved with {Object.keys(savedDraftData.userAnswers || {}).length} answers selected. We can restore you at question {savedDraftData.currentIndex + 1} of {savedDraftData.activeQuestions?.length} instantly.
                </p>
              </div>
              <div className="flex gap-2 shrink-0 md:self-center">
                <button
                  type="button"
                  onClick={handleResumeDraft}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-[10px] px-3.5 py-2.5 rounded-xl transition-all shadow-md uppercase cursor-pointer"
                >
                  Resume Drill
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-400 font-mono font-black text-[10px] px-3 py-2.5 rounded-xl transition-all uppercase cursor-pointer"
                >
                  Discard Draft
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Column - Minimized & Compact */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Session type selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Objective Category</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2" id="session-type-grid">
                  <button
                    onClick={() => setSessionType("custom")}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[90px] ${
                      sessionType === "custom"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Sliders size={16} className="text-indigo-400" />
                    <div>
                      <h4 className="text-[11px] font-black tracking-tight leading-tight">Custom Assess</h4>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">Custom topics</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSessionType("daily")}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[90px] ${
                      sessionType === "daily"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Check size={16} className="text-indigo-400" />
                    <div>
                      <h4 className="text-[11px] font-black tracking-tight leading-tight">Daily Target</h4>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">Consistency badge</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSessionType("mock")}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[90px] ${
                      sessionType === "mock"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Award size={16} className="text-indigo-400" />
                    <div>
                      <h4 className="text-[11px] font-black tracking-tight leading-tight">Mock PYQ</h4>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">Timed PYQ trial</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setSessionType("current_affairs")}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[90px] ${
                      sessionType === "current_affairs"
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Zap size={16} className="text-indigo-400 animate-pulse" />
                    <div>
                      <h4 className="text-[11px] font-black tracking-tight leading-tight">GK Pull (AI)</h4>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">Gemini generated</p>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                        setSessionType("custom");
                        setNumQuestions(5);
                        await handleLaunchSession();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between h-[90px] bg-slate-950 border-slate-850 hover:border-indigo-500 text-slate-400 hover:text-indigo-200`}
                  >
                    <Brain size={16} className="text-indigo-400" />
                    <div>
                      <h4 className="text-[11px] font-black tracking-tight leading-tight">Quick Quiz</h4>
                      <p className="text-[9px] text-slate-500 truncate mt-0.5">5 Questions now</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subject Drilling Selection & AI Semantic Matching Box */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-855">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Drill Range Filter</label>
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold text-center font-bold">AI Powered</span>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setDrillScope("all"); setSelectedSubject(""); setSelectedTopic(""); }}
                    className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                      drillScope === "all"
                        ? "bg-slate-950 border border-slate-800 text-indigo-400 font-extrabold"
                        : "text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    All Questions
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDrillScope("subject"); if (!selectedSubject && uniqueSubjectsForExam.length > 0) setSelectedSubject(uniqueSubjectsForExam[0]); }}
                    className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                      drillScope === "subject"
                        ? "bg-slate-950 border border-slate-800 text-indigo-400 font-extrabold"
                        : "text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    Subject-Wise
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrillScope("ai")}
                    className={`py-1 rounded text-[11px] font-bold transition cursor-pointer text-center ${
                      drillScope === "ai"
                        ? "bg-slate-950 border border-slate-800 text-indigo-400 font-extrabold"
                        : "text-slate-500 hover:text-slate-350"
                    }`}
                  >
                    AI Semantic
                  </button>
                </div>

                {/* Scope panel 1: Subject-wise selection */}
                {drillScope === "subject" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Select Subject</label>
                      <select
                        value={selectedSubject}
                        onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTopic(""); }}
                        className="w-full bg-slate-950 border border-slate-855 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- All Subjects --</option>
                        {uniqueSubjectsForExam.map(subj => (
                          <option key={subj} value={subj}>{subj}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Select Topic</label>
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-855 text-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- All Topics --</option>
                        {uniqueTopicsForExam.map(top => (
                          <option key={top} value={top}>{top}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Scope panel 2: AI filter match */}
                {drillScope === "ai" && (
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-3 animate-fade-in animate-once">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">AI Instant Classification Query</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiFilterQuery}
                          onChange={(e) => setAiFilterQuery(e.target.value)}
                          placeholder="e.g. teaching methodology, child development schemes..."
                          className="flex-1 bg-slate-950 border border-slate-850 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAIFilter(); } }}
                        />
                        <button
                          type="button"
                          disabled={aiIsFiltering}
                          onClick={handleAIFilter}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-100 px-3.5 rounded-lg text-xs font-black font-mono transition cursor-pointer flex items-center justify-center gap-1 shrink-0"
                        >
                          {aiIsFiltering ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          classifier
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal leading-snug">Uses high-speed client-semantic model proxy to filter matching questions from database context.</p>
                    </div>

                    {aiFilterQuery.trim() && (
                      <div className="text-[9px] font-mono flex items-center justify-between text-indigo-400 bg-indigo-500/5 px-2.5 py-1.5 rounded border border-indigo-500/10">
                        <span>Classification Matches:</span>
                        <span className="font-extrabold">{aiMatchedIds.length > 0 ? `${aiMatchedIds.length} Qs identified` : "No matches found (fallback defaults)"}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pool Size Customizer */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Batch size</label>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((num) => {
                    let text = `${num} Qs`;
                    if (num === 25) text += " (Std)";
                    if (num === 50) text += " (Full)";
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setNumQuestions(num)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-bold font-mono transition-all duration-150 cursor-pointer ${
                          numQuestions === num
                            ? "bg-indigo-600 text-slate-100 border-indigo-500 shadow-md"
                            : "bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-400"
                        }`}
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sessionType === "current_affairs" && (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Specialize GK Theme Keyword</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-base md:text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. India semiconductor mission, water disputes, G20 outcomes"
                    value={caTopicKeyword}
                    onChange={(e) => setCaTopicKeyword(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">Contextualizes the Gemini AI current affairs pool compiler generator.</p>
                </div>
              )}

              {/* Launch Action */}
              <div>
                <button
                  type="button"
                  disabled={isGeneratingCA}
                  onClick={handleLaunchSession}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 py-3 rounded-xl font-black transition-all duration-150 flex items-center justify-center gap-2 text-xs uppercase tracking-wide cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99]"
                >
                  {isGeneratingCA ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      COMPILING DRILL PREPARATION BLOCKS...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      LAUNCH DRILLING DRILLS
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Live Analytics & Consistency Console Column */}
            <div className="space-y-5">
              
              {/* Streak Consistency Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-orange-500/10 transition duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Consistency Matrix</span>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
                    <Flame size={12} className="text-orange-500 animate-pulse" />
                    <span className="text-[11px] font-extrabold text-orange-400 font-mono tracking-tight">{stats.streakCount || 0}d Active</span>
                  </div>
                </div>
                <h4 className="text-sm font-black text-slate-200 tracking-tight">{stats.streakCount || 0} Day Consistency Streak</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-1.5">
                  Keep maintaining daily consistency bounds. Play daily target sessions to upgrade status multipliers.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/80 font-mono text-[9px]">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                    <span className="text-slate-500 block uppercase font-bold text-[8px]">Highest Streak</span>
                    <span className="text-slate-300 font-extrabold text-xs">{highestStreakVal} days</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-850">
                    <span className="text-slate-500 block uppercase font-bold text-[8px]">Daily Goal Met</span>
                    <span className={stats.streakCount > 0 ? "text-emerald-400 font-extrabold text-xs" : "text-amber-400 font-extrabold text-xs"}>
                      {stats.streakCount > 0 ? "Completed ✓" : "In Progress ⏱"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Solved Question Volume Tracker */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition duration-500"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Task Ingress Volume</span>
                  <Award size={14} className="text-indigo-400" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Total Attempted</span>
                      <h3 className="text-xl font-black text-slate-200 font-mono tracking-tight mt-0.5">{stats.totalQuestionsSolved} <span className="text-[10px] text-slate-500">Qs</span></h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Success Ratio</span>
                      <div className="flex items-center gap-1 justify-end font-mono tracking-tight mt-0.5">
                        <span className="text-indigo-400 font-extrabold text-sm">{stats.totalCorrect}</span>
                        <span className="text-slate-600 text-xs">/</span>
                        <span className="text-slate-400 text-xs">{stats.totalQuestionsSolved}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-350 rounded-full"
                      style={{ width: `${stats.totalQuestionsSolved > 0 ? (stats.totalCorrect / stats.totalQuestionsSolved * 105) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Accuracy Analytics Display with Adaptive Indicators */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Accuracy Score</span>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide border ${
                    liveAccuracy >= 75 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                      : liveAccuracy >= 50 
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" 
                      : "bg-rose-500/10 text-rose-450 border-rose-500/25 animate-pulse"
                  }`}>
                    {liveAccuracy >= 75 ? "Excellent Focus" : liveAccuracy >= 50 ? "Satisfactory" : "Review Needed"}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between select-none">
                    <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                      {liveAccuracy}<span className="text-xs text-indigo-400 font-bold">%</span>
                    </h3>
                    <span className="text-[10px] text-slate-500 font-mono">Cognitive Quotient</span>
                  </div>

                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-400 leading-relaxed">
                    {liveAccuracy >= 75 
                      ? "Elite status active. Underlying AI optimizer prioritizes advanced multi-variable schemas to keep you challenged." 
                      : liveAccuracy >= 50 
                      ? "Standard balanced progression. Dynamic tuning shuffles moderate and hard objectives incrementally." 
                      : "Confidence recovery phase. Foundation building modules in force to reconstruct fundamental core accuracy levels."
                    }
                  </div>
                </div>
              </div>

              {/* Mistakes Backlog Warning */}
              {mistakeItems.length > 0 && (
                <div className="bg-rose-950/15 border border-rose-900/30 rounded-xl p-4 flex gap-3 items-start select-none">
                  <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Spaced Repetition Warning</h5>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      You have <span className="text-rose-400 font-black">{mistakeItems.length} active mistakes</span> in your backlog. Activate spaced repetition to re-inject wrong entries!
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {sessionState === "active" && activeQ && (
        <div 
          className={
            sessionType === "mock"
              ? "fixed inset-0 z-50 bg-slate-950 flex flex-col p-6 md:p-10 overflow-y-auto space-y-6 font-sans select-none"
              : "bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6"
          } 
          id="active-session-panel"
        >
          
          {/* Header Bar */}
          {sessionType === "mock" ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-5 rounded-2xl gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="animate-pulse bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-extrabold uppercase">
                    🔴 LIVE TIMED MOCK RUN
                  </span>
                  {offlineMode && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-extrabold uppercase">
                      📶 OFFLINE
                    </span>
                  )}
                </div>
                <h2 className="text-md font-extrabold text-slate-100 flex items-center gap-2">
                  <Brain size={18} className="text-indigo-400" /> {activeExam} MOCK EXAMINATION
                </h2>
                <p className="text-xs text-slate-450 text-slate-400">
                  Pattern Profile: {activeQuestions.length} Questions | Selected Answers: {Object.keys(userAnswers).length} / {activeQuestions.length}
                </p>
              </div>

              {/* Live countdown and Submission controls */}
              <div className="flex flex-wrap items-center gap-3">
                
                {/* Back to Dashboard Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Exit to Dashboard? Answers of this Mock Run will be discarded entirely.")) {
                      setSessionState("setup");
                      setMockTimeRemaining(null);
                    }
                  }}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350 font-mono text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  ← Back to Dashboard
                </button>

                {/* Countdown Time Panel */}
                {mockTimeRemaining !== null && (
                  <div className={`p-2.5 rounded-xl border font-mono text-xs font-black flex items-center gap-2 ${
                    mockTimeRemaining < 300 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" 
                      : "bg-slate-950 border-slate-850 text-indigo-400"
                  }`}>
                    <Clock size={14} className={mockTimeRemaining < 300 ? "animate-spin-slow" : ""} />
                    <span>⏱️ TIMER: {formatTime(mockTimeRemaining)}</span>
                  </div>
                )}

                {/* Submit option to submit ANYTIME */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Submit Exam? You have completed ${Object.keys(userAnswers).length} out of ${activeQuestions.length} Questions.`)) {
                      handleFinishSession();
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-550 border border-emerald-550/30 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Submit Exam Anytime ✓
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center bg-slate-950/80 p-4 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-slate-100 font-extrabold text-sm font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                  Q {currentIndex + 1} / {activeQuestions.length}
                </span>
                <button
                  onClick={() => toggleFlag(activeQ.id)}
                  className={`p-1.5 rounded transition ${activeQ.isFlagged ? "text-red-500 bg-red-500/10" : "text-slate-500 hover:text-red-400"}`}
                >
                  <Flag size={14} />
                </button>
                <button
                  onClick={() => toggleBookmark(activeQ.id)}
                  className={`p-1.5 rounded transition ${activeQ.isBookmarked ? "text-amber-500 bg-amber-500/10" : "text-slate-500 hover:text-amber-400"}`}
                >
                  <Bookmark size={14} />
                </button>
                <p className="text-xs text-slate-400 font-semibold hidden sm:inline">{activeExam} Prep block</p>
                {offlineMode && (
                  <span className="text-[10px] font-mono font-black text-amber-550 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">📶 offline drill</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                  activeQ.difficulty === 'hard' 
                    ? 'bg-rose-500/10 text-rose-400' 
                    : activeQ.difficulty === 'medium' 
                      ? 'bg-amber-500/10 text-amber-400' 
                      : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {activeQ.difficulty} Difficulty
                </span>
                
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Abandon assessment? Answers completed will not be logged.")) {
                      setSessionState("setup");
                    }
                  }}
                  className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded hover:bg-rose-500/20 transition"
                >
                  Quit Run
                </button>
              </div>
            </div>
          )}

          {/* Progress Tracker Slider bar */}
          <div className="w-full bg-slate-850 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / activeQuestions.length) * 100}%` }}
            ></div>
          </div>

          {/* Question Core content */}
          <div className="space-y-2 mt-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span className="text-indigo-400 font-bold uppercase">{activeQ.subject}</span>
              <span>•</span>
              <span>{activeQ.topic}</span>
              <span>•</span>
              <span>{activeQ.subtopic}</span>
            </div>
            
            <h3 className="text-lg md:text-xl font-bold text-slate-200 leading-relaxed">
              {activeQ.question}
            </h3>
          </div>

          {/* Answers options layout: touch target size constraints at least 44px */}
          <div className="grid grid-cols-1 gap-3.5" id="mcq-options-container">
            {activeQ.options.map((option, idx) => {
              const selectedIdx = userAnswers[activeQ.id];
              const isSelected = selectedIdx === idx;
              const hasAnswered = selectedIdx !== undefined;
              const isCorrectOption = idx === activeQ.correctOptionIndex;

              let optionStyle = "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 text-slate-300";
              let badgeStyle = "bg-slate-900 text-slate-400 group-hover:bg-slate-800 transition";

              if (sessionType === "mock") {
                if (isSelected) {
                  optionStyle = "bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-600/5 ring-1 ring-indigo-500";
                  badgeStyle = "bg-indigo-600 text-slate-100 font-semibold";
                }
              } else if (hasAnswered) {
                if (isCorrectOption) {
                  // highlight Green immediately
                  optionStyle = "bg-emerald-500/10 border-emerald-500/70 text-slate-100 shadow-md shadow-emerald-500/5";
                  badgeStyle = "bg-emerald-500 text-slate-900 font-extrabold";
                } else if (isSelected) {
                  // user incorrect
                  optionStyle = "bg-rose-500/10 border-rose-500/70 text-slate-100 shadow-md shadow-rose-500/5";
                  badgeStyle = "bg-rose-500 text-slate-100 font-extrabold";
                } else {
                  // regular faded out
                  optionStyle = "bg-slate-950/40 border-slate-900 text-slate-550 opacity-40";
                  badgeStyle = "bg-slate-900 text-slate-500";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    // in mock test mode, allow choosing / changing selection anytime!
                    setUserAnswers(prev => ({
                      ...prev,
                      [activeQ.id]: idx
                    }));
                  }}
                  disabled={sessionType !== "mock" && hasAnswered}
                  className={`group p-4 rounded-xl border text-left transition-all duration-150 flex items-center gap-4 cursor-pointer min-h-[48px] ${optionStyle}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono tracking-wider ${badgeStyle}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-semibold leading-relaxed flex-1">
                    {option}
                  </span>

                  {sessionType !== "mock" && hasAnswered && isCorrectOption && (
                    <CheckCircle2 size={18} className="text-emerald-400 animate-pulse ml-2" />
                  )}
                  {sessionType !== "mock" && hasAnswered && isSelected && !isCorrectOption && (
                    <XCircle size={18} className="text-rose-400 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Pedagogical Review cards on Select click */}
          {hasAnsweredCurrent && sessionType !== "mock" && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 mt-6 space-y-4 animate-slide-up" id="mcq-explanation-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                  <BookOpen size={14} />
                  <span>Pedagogical Solution Analysis & Explanation</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isFetchingInsights}
                    onClick={() => handleFetchInsights(activeQ)}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-slate-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    {isFetchingInsights ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        Fetching Insights...
                      </>
                    ) : activeInsights[activeQ.id] ? (
                      "✓ AI Insights Active"
                    ) : (
                      "✨ Spark AI Topic Insights"
                    )}
                  </button>
                </div>
              </div>
              
              {userAnswers[activeQ.id] === activeQ.correctOptionIndex ? (
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  Correct Answer Resolved! (+1 Score saved)
                </p>
              ) : (
                <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  Incorrect Response Selected. Item logged dynamically to Mistakes Book memory.
                </p>
              )}

              <p className="text-slate-300 text-sm leading-relaxed font-normal">
                {activeQ.explanation}
              </p>

              {/* Loader layout for fetching */}
              {isFetchingInsights && (
                <div className="border-t border-slate-850 pt-4 space-y-2 animate-pulse">
                  <div className="h-3.5 bg-slate-800 rounded w-1/3"></div>
                  <div className="h-2.5 bg-slate-900 rounded w-full"></div>
                  <div className="h-2.5 bg-slate-900 rounded w-4/5"></div>
                  <div className="h-2.5 bg-slate-900 rounded w-5/6"></div>
                </div>
              )}

              {/* Custom styled AI Insights render block */}
              {activeInsights[activeQ.id] && renderFancyMarkdown(activeInsights[activeQ.id])}

            </div>
          )}

          {/* Live Navigation Bar */}
          <div className="flex justify-between items-center border-t border-slate-800 pt-6 mt-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {currentIndex === activeQuestions.length - 1 ? (
              <button
                onClick={handleFinishSession}
                disabled={sessionType !== "mock" && activeQuestions.some(q => userAnswers[q.id] === undefined)}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 transition shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
              >
                Submit & Finish Exam <FlagIcon size={14} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={sessionType !== "mock" && userAnswers[activeQ.id] === undefined}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1"
              >
                Next Challenge <ChevronRight size={16} />
              </button>
            )}
          </div>

        </div>
      )}

      {sessionState === "results" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 text-center max-w-2xl mx-auto" id="session-results-panel">
          
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Award size={36} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-100">Assessment Complete!</h3>
            <p className="text-xs text-slate-400">Your practice results has been compiled and injected successfully.</p>
          </div>

          {/* Scores Overview block */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950 p-6 rounded-xl border border-slate-800">
            <div className="border-r border-slate-800 space-y-1">
              <p className="text-xs text-slate-500 uppercase font-mono">Accuracy index</p>
              <p className={`text-4xl font-extrabold font-mono ${
                sessions[0]?.accuracy >= 80 ? 'text-emerald-400' : sessions[0]?.accuracy >= 60 ? 'text-indigo-400' : 'text-rose-400'
              }`}>
                {sessions[0]?.accuracy || 0}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase font-mono">Total score ratio</p>
              <p className="text-4xl font-extrabold font-mono text-slate-100">
                {sessions[0]?.score} <span className="text-lg text-slate-500">/ {sessions[0]?.totalQuestions}</span>
              </p>
            </div>
          </div>

          {/* Consistency checklist summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-left text-xs gap-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <div>
                <p className="font-semibold text-slate-200">Active Streak Count Updated</p>
                <p className="text-[10px] text-slate-400">Total days continuous tracking check: {stats.streakCount || 0} days</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Today: Yes ✅</span>
          </div>

          {/* Helpful suggestions feedback */}
          <p className="text-xs text-slate-400">
            {sessions[0]?.accuracy >= 80
              ? "Magnificent job! You are matching the benchmarks for the RAS Mains. Re-assess the Mistakes Book to polish minor margins."
              : "Review the Mistakes Book to understand why previous questions failed. Continuous spaced repetitions on missed topics will boost accuracy."}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => setSessionState("setup")}
              className="flex-1 px-4 py-3 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-slate-100 transition shadow"
            >
              Start New Test Setup
            </button>
            <button
              onClick={() => {
                // We'll let the parent tab trigger handle views
                const clickTarget = document.getElementById("tab-navigation-mistakes");
                if (clickTarget) clickTarget.click();
              }}
              className="flex-1 px-4 py-3 text-xs font-bold rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 transition"
            >
              Analyze Mistakes Book
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

// Small helper flag icon for finish button
function FlagIcon({ size = 16, className = "" }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
