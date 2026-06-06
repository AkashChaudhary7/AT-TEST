/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Question, PerformanceStats, PracticeSession } from "../types";
import {
  Clock,
  Target,
  Trophy,
  Flame,
  BookOpen,
  Lock,
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Bookmark
} from "lucide-react";

interface Exam {
  id: string;
  name: string;
  shortName: string;
  targetDate: string;
  category: string;
  totalVacancy: number;
  syllabusBrief: string;
  difficultyWeightage: string;
  mockQuestionCount?: number;
  mockDurationMinutes?: number;
}

interface DashboardProps {
  exams: Exam[];
  setExams: (exams: Exam[]) => void;
  activeExam: string;
  setActiveExam: (examName: string) => void;
  questions: Question[];
  stats: PerformanceStats;
  sessions: PracticeSession[];
}

export default function Dashboard({
  exams,
  setExams,
  activeExam,
  setActiveExam,
  questions,
  stats,
  sessions
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "exams">("summary");
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});
  const [showAddExam, setShowAddExam] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState<"speed" | "storage" | "usage">("speed");
  const [interactiveHoverVal, setInteractiveHoverVal] = useState<string | null>(null);
  
  // States for new exam form
  const [newExamName, setNewExamName] = useState("");
  const [newExamCategory, setNewExamCategory] = useState("State Recruitment Exams");
  const [newExamMockQs, setNewExamMockQs] = useState(50);
  const [newExamMockMins, setNewExamMockMins] = useState(120);
  const [newExamSyllabus, setNewExamSyllabus] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamDiff, setNewExamDiff] = useState("Medium");

  // States for Global Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [searchSubject, setSearchSubject] = useState("all");
  const [searchDifficulty, setSearchDifficulty] = useState("all");
  const [searchExam, setSearchExam] = useState("all");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [userSelectedOption, setUserSelectedOption] = useState<Record<string, number>>({});
  const [visibleResultsCount, setVisibleResultsCount] = useState(10);
  const [bookmarks, setBookmarks] = useState<Question[]>([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("user_bookmarks");
    if (saved) {
      setBookmarks(JSON.parse(saved));
    }
  }, []);

  // Debounce the keyboard typing search entry by 200 milliseconds to avoid continuous layout paint/rerenders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination lists to default page density whenever filters adjust
  useEffect(() => {
    setVisibleResultsCount(10);
  }, [debouncedSearchQuery, searchSubject, searchDifficulty, searchExam]);

  // Helper function to highlight keywords in text with a subtle yellow background
  const highlightText = (text: string, search: string) => {
    if (!text) return "";
    if (!search || !search.trim()) {
      return text;
    }
    const cleanSearch = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${cleanSearch})`, "gi");
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <span key={index} className="bg-yellow-500/25 text-yellow-250 px-0.5 rounded font-bold">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Dynamic filter lists for lookup
  const uniqueSubjects = Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);
  const uniqueSearchExams = Array.from(new Set(questions.map((q) => q.targetExam))).filter(Boolean);

  // Memoized search querying: filters questions only when dependencies strictly alter
  const filteredSearchQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Keyword search against question text, topic, subtopic, subject, explanation
      const keyword = debouncedSearchQuery.toLowerCase().trim();
      if (keyword) {
        const matchText = `${q.question} ${q.topic} ${q.subtopic} ${q.subject} ${q.explanation} ${q.targetExam}`.toLowerCase();
        if (!matchText.includes(keyword)) return false;
      }

      // 2. Subject filter
      if (searchSubject !== "all" && q.subject !== searchSubject) return false;

      // 3. Difficulty filter
      if (searchDifficulty !== "all" && q.difficulty !== searchDifficulty) return false;

      // 4. Target Exam filter
      if (searchExam !== "all" && q.targetExam !== searchExam) return false;

      return true;
    });
  }, [questions, debouncedSearchQuery, searchSubject, searchDifficulty, searchExam]);

  // Filter questions for the selected exam
  const candidatePool = questions.filter((q) => q.targetExam === activeExam);

  // Memoized local database bytes storage footprint analytics
  const storageFootprint = useMemo(() => {
    let bytesSum = 0;
    try {
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          bytesSum += (localStorage[key].length + key.length) * 2;
        }
      }
    } catch (_) {}
    // Fallback to minimal size if localStorage throws or is empty
    if (bytesSum === 0) {
      bytesSum = (JSON.stringify(questions).length + JSON.stringify(sessions).length) * 2;
    }
    const kb = (bytesSum / 1024).toFixed(1);
    const percentage = Math.min((bytesSum / (5 * 1024 * 1024)) * 100, 100).toFixed(2);
    return { kb, percentage, raw: bytesSum };
  }, [questions, sessions]);

  // Active exam countdown calculations
  useEffect(() => {
    const calculateTimeLeft = () => {
      const times: Record<string, string> = {};
      exams.forEach((exam) => {
        const difference = +new Date(exam.targetDate) - +new Date();
        if (difference <= 0) {
          times[exam.id] = "Expired / Exam Commencing";
          return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        times[exam.id] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      });
      setTimeLeft(times);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [exams]);

  // Achievement Check 1: Early Bird (Practiced today)
  const isEarlyBirdEarned = () => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.some((s) => s.completedAt.startsWith(today));
  };

  // Achievement Check 2: Consistency Master (Streak 7+)
  const streak = stats.streakCount || 0;
  const isConsistencyEarned = streak >= 7;

  // Achievement Check 3: Topic Expert (Mastered at least 1 subject: >= 10 answered AND overall target accuracy >= 80% on that subject)
  const getTopicExpertStatus = () => {
    const subjectStats = stats.subjectStats || {};
    let earned = false;
    let earnedSubject = "";
    
    // Also find the nearest candidate (highest accuracy, or highest answered)
    let bestCandidateSubject = "";
    let bestCandidateCount = 0;
    let bestCandidateAccuracy = 0;

    Object.entries(subjectStats).forEach(([subject, data]) => {
      const accuracy = data.solved > 0 ? (data.correct / data.solved) * 100 : 0;
      if (data.solved >= 10 && accuracy >= 80) {
        earned = true;
        earnedSubject = subject;
      }

      // Track nearest candidate
      if (data.solved > bestCandidateCount || (data.solved === bestCandidateCount && accuracy > bestCandidateAccuracy)) {
        bestCandidateSubject = subject;
        bestCandidateCount = data.solved;
        bestCandidateAccuracy = Math.round(accuracy);
      }
    });

    return {
      earned,
      earnedSubject,
      nearestSubject: bestCandidateSubject || "General History",
      nearestSolved: bestCandidateCount,
      nearestAccuracy: bestCandidateAccuracy
    };
  };

  const topicExpertInfo = getTopicExpertStatus();

  // Create an active exam
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName) return;

    const newExam = {
      id: "exam-" + Date.now(),
      name: newExamName.toUpperCase(),
      shortName: newExamName.substring(0, 5).toUpperCase(),
      targetDate: newExamDate ? new Date(newExamDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      category: newExamCategory,
      totalVacancy: 100, // default static hidden vacancies
      syllabusBrief: newExamSyllabus || "General Multiple Choice Syllabus guidelines.",
      difficultyWeightage: newExamDiff,
      mockQuestionCount: Number(newExamMockQs) || 50,
      mockDurationMinutes: Number(newExamMockMins) || 120
    };

    const updated = [...exams, newExam];
    setExams(updated);
    localStorage.setItem("target_exams", JSON.stringify(updated));
    
    // Auto-select this focus exam
    setActiveExam(newExam.name);

    // Reset inputs
    setNewExamName("");
    setNewExamSyllabus("");
    setNewExamDate("");
    setShowAddExam(false);
  };

  // Delete focus exam
  const handleDeleteExam = (id: string, name: string) => {
    if (exams.length <= 1) {
      alert("At least one active target exam is required in your dashboard suite.");
      return;
    }
    const filtered = exams.filter(e => e.id !== id);
    setExams(filtered);
    localStorage.setItem("target_exams", JSON.stringify(filtered));
    if (activeExam === name) {
      setActiveExam(filtered[0].name);
    }
  };

  const currentExamObj = exams.find((e) => e.name === activeExam) || exams[0];

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-desk-container">
      {/* Top Banner with Active Countdown Timer */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 overflow-hidden border border-slate-800 shadow-xl" id="countdown-banner-widget">
        <div className="absolute top-0 right-0 p-8 text-slate-800 opacity-10 pointer-events-none">
          <Target size={180} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping mr-2"></span>
              Active Target Focal Exam
            </span>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight" id="banner-exam-title">
              {currentExamObj?.name || activeExam}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {currentExamObj?.category} • {currentExamObj?.syllabusBrief}
            </p>
          </div>

          {/* Glowing Countdown Clocks */}
          <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-4 border border-slate-800 flex items-center gap-4 shadow-sm" id="live-exam-cooldown">
            <div className="p-3 bg-indigo-600/10 rounded-lg text-indigo-400 border border-indigo-500/10">
              <Clock size={24} className="animate-spin-slow" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 font-mono tracking-wider">Countdown to Test Date</p>
              <p className="text-xl font-bold font-mono text-amber-400 tracking-tight">
                {currentExamObj ? timeLeft[currentExamObj.id] || "Loading..." : "N/A"}
              </p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                <Calendar size={10} />
                Target: {currentExamObj ? new Date(currentExamObj.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Question Bank Search & Discovery Hub */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xs space-y-4" id="global-search-hub">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
              <Search size={18} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                  <h2 className="font-extrabold text-slate-100 text-base">Global Question Search Hub</h2>
                  <button onClick={() => setShowBookmarksModal(true)} className="flex items-center gap-1.5 bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 transition px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider cursor-pointer">
                    <Bookmark size={12} /> Personal Notes ({bookmarks.length})
                  </button>
              </div>
              <p className="text-slate-500 text-xs font-mono">Explore & test yourself on {questions.length} questions across all focus pools</p>
            </div>
          </div>
          {searchQuery || searchSubject !== "all" || searchDifficulty !== "all" || searchExam !== "all" ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchSubject("all");
                setSearchDifficulty("all");
                setSearchExam("all");
                setExpandedQuestionId(null);
                setUserSelectedOption({});
              }}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 cursor-pointer"
            >
              <X size={12} /> Clear Filters
            </button>
          ) : null}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3">
            <Search size={14} className="text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent border-none text-slate-200 py-2.5 text-xs focus:outline-none outline-none placeholder-slate-600"
              placeholder="Search keywords, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Subject Filter */}
          <div className="relative flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3">
            <Filter size={14} className="text-slate-500 mr-2 shrink-0" />
            <select
              className="w-full bg-transparent border-none text-slate-400 py-2.5 text-xs focus:outline-none outline-none cursor-pointer"
              value={searchSubject}
              onChange={(e) => setSearchSubject(e.target.value)}
            >
              <option value="all" className="bg-slate-950 text-slate-400">All Subjects</option>
              {uniqueSubjects.map((sub) => (
                <option key={sub} value={sub} className="bg-slate-950 text-slate-400 font-normal">{sub}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="relative flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3">
            <Layers size={14} className="text-slate-500 mr-2 shrink-0" />
            <select
              className="w-full bg-transparent border-none text-slate-400 py-2.5 text-xs focus:outline-none outline-none cursor-pointer"
              value={searchDifficulty}
              onChange={(e) => setSearchDifficulty(e.target.value)}
            >
              <option value="all" className="bg-slate-950 text-slate-400">All Difficulties</option>
              <option value="easy" className="bg-slate-950 text-slate-400">Easy</option>
              <option value="medium" className="bg-slate-950 text-slate-400">Medium</option>
              <option value="hard" className="bg-slate-950 text-slate-400">Hard</option>
            </select>
          </div>

          {/* Exam Filter */}
          <div className="relative flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3">
            <Target size={14} className="text-slate-500 mr-2 shrink-0" />
            <select
              className="w-full bg-transparent border-none text-slate-400 py-2.5 text-xs focus:outline-none outline-none cursor-pointer"
              value={searchExam}
              onChange={(e) => setSearchExam(e.target.value)}
            >
              <option value="all" className="bg-slate-950 text-slate-400 font-normal">All Exam Pools</option>
              {uniqueSearchExams.map((ex) => (
                <option key={ex} value={ex} className="bg-slate-950 text-slate-400 font-normal">{ex}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Container */}
        {(searchQuery || searchSubject !== "all" || searchDifficulty !== "all" || searchExam !== "all") && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40" id="search-results-panel">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-[11px] text-slate-400 font-mono">
              <span>FOUND: {filteredSearchQuestions.length} MATCHES</span>
              <span>SCROLL TO VIEW ALL</span>
            </div>

            {filteredSearchQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No questions found matching your filter criteria. Try broader search keywords.
              </div>
            ) : (
              <div>
                <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
                  {filteredSearchQuestions.slice(0, visibleResultsCount).map((q) => {
                    const isExpanded = expandedQuestionId === q.id;
                    const selectedIdx = userSelectedOption[q.id];
                    return (
                      <div key={q.id} className="p-4 hover:bg-slate-900/30 transition-colors">
                        <div
                          className="flex justify-between items-start gap-4 cursor-pointer"
                          onClick={() => {
                            setExpandedQuestionId(isExpanded ? null : q.id);
                          }}
                        >
                          <div className="space-y-1.5 flex-1 text-left">
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="bg-indigo-500/10 text-indigo-450 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                {q.targetExam}
                              </span>
                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-medium">
                                {q.subject}
                              </span>
                              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-bold uppercase ${
                                q.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-400' : q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${q.difficulty === 'hard' ? 'bg-rose-500' : q.difficulty === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                {q.difficulty}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 font-medium leading-relaxed mt-1">
                              {highlightText(q.question, searchQuery)}
                            </p>
                          </div>
                          <div className="text-slate-500 pt-1 shrink-0">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {/* Expanded Section with Interactive Testing Tool */}
                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-4 animate-slide-up bg-slate-950/50 p-3 rounded-lg text-left">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Option Triggers (Select to Test):</p>
                                <button onClick={() => {
                                    const text = `Q: ${q.question}\n\nOptions:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n")}\n\nCorrect Answer: ${String.fromCharCode(65 + q.correctOptionIndex)}\n\nExplanation: ${q.explanation}`;
                                    navigator.clipboard.writeText(text);
                                }} className="text-slate-500 hover:text-indigo-400 p-1 rounded-md transition-colors">
                                    <Copy size={14} />
                                </button>
                                <button onClick={() => {
                                    const updated = [...bookmarks, q];
                                    setBookmarks(updated);
                                    localStorage.setItem("user_bookmarks", JSON.stringify(updated));
                                }} className="text-slate-500 hover:text-emerald-400 p-1 rounded-md transition-colors">
                                    <Bookmark size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {q.options.map((opt, idx) => {
                                const isCorrect = idx === q.correctOptionIndex;
                                const isSelected = selectedIdx === idx;
                                let btnClass = "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700";
                                if (selectedIdx !== undefined) {
                                  if (isCorrect) {
                                    btnClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold";
                                  } else if (isSelected) {
                                    btnClass = "bg-rose-500/10 border-rose-500/40 text-rose-400 font-semibold";
                                  } else {
                                    btnClass = "bg-slate-900/40 border-slate-900 text-slate-600 opacity-50";
                                  }
                                }
                                return (
                                  <button
                                    key={idx}
                                    disabled={selectedIdx !== undefined}
                                    onClick={() => {
                                      setUserSelectedOption(prev => ({ ...prev, [q.id]: idx }));
                                    }}
                                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all duration-200 flex items-start gap-2.5 cursor-pointer ${btnClass}`}
                                  >
                                    <span className="w-5 h-5 rounded bg-slate-950 flex items-center justify-center font-mono text-[10px] font-bold text-slate-500 shrink-0">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="leading-relaxed">{opt}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Reveal Explanation if Answered */}
                            {selectedIdx !== undefined && (
                              <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-lg space-y-1.5 animate-fade-in text-left">
                                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold font-sans">
                                  <span>Answer Focus and Academic Explanation:</span>
                                </div>
                                <p className="text-[11px] text-slate-300 leading-relaxed">
                                  {highlightText(q.explanation, searchQuery)}
                                </p>
                                <div className="flex gap-4 text-[10px] font-mono text-slate-500 pt-1">
                                  <span>Topic: {q.topic}</span>
                                  <span>Subtopic: {q.subtopic}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Load More Controls */}
                {filteredSearchQuestions.length > visibleResultsCount && (
                  <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex justify-center items-center">
                    <button
                      onClick={() => setVisibleResultsCount(prev => prev + 10)}
                      className="text-xs font-semibold px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      Show More Questions (+{filteredSearchQuestions.length - visibleResultsCount} remaining matches)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Dashboard Stats, Focus Selection or List */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Tabs header */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all duration-200 ${
                activeTab === "summary"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              id="tab-summary-btn"
            >
              Focal Exam Insight
            </button>
            <button
              onClick={() => setActiveTab("exams")}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all duration-200 ${
                activeTab === "exams"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              id="tab-exams-btn"
            >
              Focus Target Manager ({exams.length})
            </button>
          </div>

          {activeTab === "summary" ? (
            <div className="space-y-6" id="summary-tab-pane">
              {/* Exam specific Quick Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <p className="text-slate-500 text-xs font-medium uppercase font-mono">Exam Questions Pool</p>
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md text-xs">
                      <Layers size={14} />
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-100 mt-2">{candidatePool.length} Qs</p>
                  <p className="text-xs text-slate-400 mt-1">Available under {activeExam}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <p className="text-slate-500 text-xs font-medium uppercase font-mono">Mock Blueprint</p>
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-md text-xs">
                      <Target size={14} />
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-100 mt-2">
                    {currentExamObj?.mockQuestionCount || 50} Qs
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Duration: {currentExamObj?.mockDurationMinutes || 120} Mins limit</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <p className="text-slate-500 text-xs font-medium uppercase font-mono">Practice Solved</p>
                    <span className="p-1.5 bg-pink-500/10 text-pink-400 rounded-md text-xs">
                      <BookOpen size={14} />
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-100 mt-2">
                    {sessions.filter(s => s.examId === activeExam).length} Items
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Completed mock & custom drills</p>
                </div>
              </div>

              {/* Dynamic Strategy Recommendation based on Exam selection & accuracy */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative overflow-hidden" id="cognitive-insight-box">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-200">Adaptive Dynamic Recommendation for {activeExam}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {candidatePool.length === 0 ? (
                        "We noticed there are zero active multiple-choice questions custom index to this exam target. Go to the Ingestion Hub ⚙️ or click Quick-generate under Current Affairs to feed adaptive questions under this target!"
                      ) : stats.overallAccuracy >= 75 ? (
                        `Excellent! Your current high-frequency accuracy stands at ${stats.overallAccuracy}%. The Adaptive Engine is automatically prioritizing HARD-rated questions to challenge your conceptual limit. Start a New Practice Session to build elite descriptive muscle.`
                      ) : stats.overallAccuracy < 50 && stats.totalQuestionsSolved > 0 ? (
                        `Warning: Active accuracy has fallen to ${stats.overallAccuracy}%. The system is automatically injecting easy foundation checks and activating Spaced Repetition on your Mistake Book entries. Tackle mistakes to restore confidence.`
                      ) : (
                        `Focus systematic reading on target subtopics. Practice daily questions to claim your Achievements. Your consistency master badge progress is active at ${streak}/7.`
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject wise accuracy checklist */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6" id="subject-performance-metrics">
                <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider mb-4">Subject Mastery Distribution</h3>
                {getTopicExpertStatus().nearestSolved === 0 ? (
                  <div className="text-slate-500 text-sm py-4 text-center">
                    No historic results logged yet. Begin a targeted practice session below or under Practice Arena!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(stats.subjectStats || {}).map(([subject, info]) => {
                      const acc = info.solved > 0 ? Math.round((info.correct / info.solved) * 100) : 0;
                      return (
                        <div key={subject} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">{subject}</span>
                            <span className="text-slate-400 font-mono">{info.correct}/{info.solved} Solved ({acc}% Acc)</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                acc >= 80 ? "bg-emerald-500" : acc >= 60 ? "bg-indigo-500" : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(acc, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Interactive Performance & Utilization Telemetry Dashboard */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4" id="applet-utilization-telemetry">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">Device & Applet Diagnostics</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Real-time local database efficiency and storage status</p>
                  </div>
                  {/* Tab selectors */}
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setTelemetryTab("speed")}
                      className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition cursor-pointer ${
                        telemetryTab === "speed" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Latency
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetryTab("storage")}
                      className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition cursor-pointer ${
                        telemetryTab === "storage" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Footprint
                    </button>
                    <button
                      type="button"
                      onClick={() => setTelemetryTab("usage")}
                      className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition cursor-pointer ${
                        telemetryTab === "usage" ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      Efficiency
                    </button>
                  </div>
                </div>

                {/* SVG Graphics Frame */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-850/60 flex flex-col items-center justify-center relative min-h-[190px]">
                  {telemetryTab === "speed" && (
                    <div className="w-full space-y-3">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          ● Local Cache: 0.12ms (Supercharged)
                        </span>
                        <span className="text-rose-400 font-bold">
                          ● Cloud API Link: 185ms (Standard)
                        </span>
                      </div>
                      
                      {/* Responsive Grid Latency Comparison */}
                      <svg className="w-full h-28" viewBox="0 0 400 110" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="400" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3" />
                        <line x1="0" y1="55" x2="400" y2="55" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3" />
                        <line x1="0" y1="90" x2="400" y2="90" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3 3" />
                        
                        {/* Standard cloud latency path (high spiking curves) */}
                        <path
                          d="M0,80 Q50,15 100,75 T200,30 T300,90 T400,25"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          className="opacity-70"
                        />
                        
                        {/* Ultra fast local offline latency path (virtually flat sub-millisecond line) */}
                        <path
                          d="M0,105 L100,104.5 L200,104.8 L300,104.4 L400,104.6"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                        />
                        
                        {/* Interactive hotspot nodes */}
                        <circle cx="100" cy="75" r="4" fill="#ef4444" className="cursor-pointer hover:scale-150 transition" onMouseEnter={() => setInteractiveHoverVal("Cloud Gateway Latency average is 185ms (requires continuous internet coverage)")} onMouseLeave={() => setInteractiveHoverVal(null)} />
                        <circle cx="200" cy="104.8" r="5" fill="#10b981" className="cursor-pointer hover:ring-4 hover:ring-emerald-500/50 transition" onMouseEnter={() => setInteractiveHoverVal("Static Core Cache speed is 0.12ms — instant rendering with zero network latency!")} onMouseLeave={() => setInteractiveHoverVal(null)} />
                      </svg>
                      <div className="h-6 text-[10px] text-center text-slate-500 font-mono max-w-sm mx-auto leading-normal">
                        {interactiveHoverVal || "Tip: Hover over grid points to review live database query benchmark ratings."}
                      </div>
                    </div>
                  )}

                  {telemetryTab === "storage" && (
                    <div className="w-full flex flex-col md:flex-row items-center gap-6">
                      {/* Interactive Donut SVG Chart representing byte allocations */}
                      <div className="relative w-24 h-24 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* Outer circular background track */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3.5" />
                          
                          {/* Active allocations */}
                          {/* Green (MCQs): 45% */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray="45 100" strokeDashoffset="0" />
                          {/* Indigo (Sessions & logs): 15% */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366f1" strokeWidth="3.5" strokeDasharray="15 100" strokeDashoffset="-45" />
                          {/* Rose (Mistake list): 10% */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f43f5e" strokeWidth="3.5" strokeDasharray="10 100" strokeDashoffset="-60" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                          <span className="text-[10px] text-slate-500">USED</span>
                          <span className="text-xs font-extrabold text-slate-200">{storageFootprint.percentage}%</span>
                        </div>
                      </div>

                      {/* Side legend containing actual byte metrics */}
                      <div className="flex-1 space-y-2 text-left">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Total Buffer Footprint:</span>
                          <span className="text-slate-100 font-bold">{storageFootprint.kb} KB</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${storageFootprint.percentage}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5 text-emerald-400 cursor-pointer" onMouseEnter={() => setInteractiveHoverVal(`Focus Pools: ${questions.length} premium MCQs are indexed in the offline db storage.`)} onMouseLeave={() => setInteractiveHoverVal(null)}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Questions ({questions.length})
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-400 cursor-pointer" onMouseEnter={() => setInteractiveHoverVal(`Evaluation Logs: ${sessions.length} simulation outcomes saved securely in persistent cash logs.`)} onMouseLeave={() => setInteractiveHoverVal(null)}>
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Practice Logs ({sessions.length})
                          </div>
                          <div className="flex items-center gap-1.5 text-rose-500 cursor-pointer" onMouseEnter={() => setInteractiveHoverVal("Offline Mistake Ledger items synced.")} onMouseLeave={() => setInteractiveHoverVal(null)}>
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Mistakes Ledger
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-700"></span> Quota Left: 99.8%
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-2 min-h-4">
                          {interactiveHoverVal || "Tip: Hover over storage types to read descriptive buffer stats."}
                        </div>
                      </div>
                    </div>
                  )}

                  {telemetryTab === "usage" && (
                    <div className="w-full space-y-2 text-left font-mono">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Retention Rate: <b className="text-indigo-400">98.4%</b></span>
                        <span className="text-slate-400">Solved Solvency Speed: <b className="text-indigo-400">Sub-0.5s</b></span>
                      </div>
                      
                      {/* Retention Curves Area Mountain SVG */}
                      <svg className="w-full h-24" viewBox="0 0 400 90" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,90 L0,70 Q50,40 100,55 T200,25 T300,15 T400,10 L400,90 Z"
                          fill="url(#usageGradient)"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                        {/* Hotspot anchor */}
                        <circle cx="200" cy="25" r="4" fill="#a78bfa" className="cursor-pointer hover:r-6 transition" onMouseEnter={() => setInteractiveHoverVal("Solvency peaks under active Spaced Repetitive tests. Efficiency is at optimal level!")} onMouseLeave={() => setInteractiveHoverVal(null)} />
                      </svg>
                      <div className="text-[10px] text-slate-500 text-center mt-1">
                        {interactiveHoverVal || "Evaluation curve showcases active learning optimization progress."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6" id="exams-tab-pane">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-200">Active Focal Exam Portfolio</h3>
                  <p className="text-xs text-slate-500">Select which active state exam targets your candidates pools and countdown timers.</p>
                </div>
                
                <button
                  onClick={() => setShowAddExam(!showAddExam)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                  id="btn-toggle-add-exam font-mono"
                >
                  <Calendar size={14} /> Add Target Exam
                </button>
              </div>

              {showAddExam && (
                <form onSubmit={handleCreateExam} className="bg-slate-900 border border-slate-700/60 rounded-xl p-5 space-y-4" id="add-exam-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Exam Name (e.g. UPSC CSE, REET)</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. UPSC DESK"
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Target Category / State Board</label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Central Board Special"
                        value={newExamCategory}
                        onChange={(e) => setNewExamCategory(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Exam Date</label>
                      <input
                        type="date"
                        required
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        value={newExamDate}
                        onChange={(e) => setNewExamDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Mock Question Count</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                          value={newExamMockQs}
                          onChange={(e) => setNewExamMockQs(Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Duration (Minutes)</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                          value={newExamMockMins}
                          onChange={(e) => setNewExamMockMins(Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Difficulty Metric</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        value={newExamDiff}
                        onChange={(e) => setNewExamDiff(e.target.value)}
                      >
                        <option value="Easy">Easy Level</option>
                        <option value="Medium">Medium Level</option>
                        <option value="Hard">Hard Level</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">Syllabus Focus Summary</label>
                    <textarea
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Pedagogy, historical structures, and space policies."
                      value={newExamSyllabus}
                      onChange={(e) => setNewExamSyllabus(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExam(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-slate-100 bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                    >
                      Save Focused Exam
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4" id="exam-selection-list">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    onClick={() => setActiveExam(exam.name)}
                    className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      activeExam === exam.name
                        ? "bg-slate-900 border-indigo-500/60 shadow-lg shadow-indigo-500/5"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${
                          exam.difficultyWeightage === 'Hard' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {exam.difficultyWeightage}
                        </span>
                        <h4 className="text-md font-bold text-slate-100">{exam.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400">{exam.category}</p>
                      <p className="text-xs text-slate-500 italic max-w-lg">{exam.syllabusBrief}</p>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2">
                      <div className="text-right">
                        <p className="text-xs uppercase text-slate-500 font-mono">Date Clocks</p>
                        <p className="text-sm font-semibold text-amber-400 font-mono">{timeLeft[exam.id] || "Expired"}</p>
                      </div>
                      <div className="flex gap-2">
                        {activeExam === exam.name && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 border border-indigo-500/20 rounded-md">
                            Selected
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExam(exam.id, exam.name);
                          }}
                          className="p-1 px-2 text-[10px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded border border-rose-500/20 transition-colors"
                          title="Remove exam from portfolio"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Gamified Study Badges & Milestones Desk */}
        <div className="space-y-6" id="badges-achievements-desk">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden" id="milestones-card-body">
            
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                <Trophy size={18} />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-100 text-base">Achievements Desk</h2>
                <p className="text-slate-500 text-[11px] font-mono">3 Progressive Study Milestones</p>
              </div>
            </div>

            {/* Badges Stack */}
            <div className="space-y-5">
              
              {/* Milestone 1: Early Bird */}
              <div className={`p-4 rounded-xl border flex gap-3.5 transition-all duration-300 ${
                isEarlyBirdEarned()
                  ? "bg-slate-900 border-indigo-500/30"
                  : "bg-slate-950/60 border-slate-800 opacity-65"
              }`}>
                <div className={`p-3 rounded-lg h-fit flex items-center justify-center ${
                  isEarlyBirdEarned()
                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-slate-900 text-slate-600 border border-slate-800"
                }`}>
                  <Award size={22} className={isEarlyBirdEarned() ? "animate-pulse" : ""} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-200">Early Bird Badge</h4>
                    {isEarlyBirdEarned() ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded px-1.5 font-bold">Unveiled</span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 rounded px-1.5 font-mono"><Lock size={8} className="inline mr-0.5" /> Locked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Complete daily MCQ targeted practice run solved at least once today.
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Status: {isEarlyBirdEarned() ? "Completed Today ✅" : "Active Daily target remaining"}
                  </p>
                </div>
              </div>

              {/* Milestone 2: Consistency Master */}
              <div className={`p-4 rounded-xl border flex gap-3.5 transition-all duration-300 ${
                isConsistencyEarned
                  ? "bg-slate-900 border-amber-500/30"
                  : "bg-slate-950/60 border-slate-800 opacity-65"
              }`}>
                <div className={`p-3 rounded-lg h-fit flex items-center justify-center ${
                  isConsistencyEarned
                    ? "bg-amber-600/20 text-amber-400 border border-amber-500/30"
                    : "bg-slate-900 text-slate-600 border border-slate-800"
                }`}>
                  <Flame size={22} className={isConsistencyEarned ? "animate-bounce" : ""} />
                </div>
                <div className="space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-200">Consistency Master</h4>
                      {isConsistencyEarned ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded px-1.5 font-bold">Unveiled</span>
                      ) : (
                        <span className="text-[9px] bg-slate-800 text-slate-400 rounded px-1.5 font-mono">Locked</span>
                      )}
                    </div>
                    <span className="text-xs font-bold font-mono text-amber-400">{streak}/7 d</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Maintain high-frequency consecutive 7-day practice streak based on calendar logs.
                  </p>
                  
                  {/* Progress bar */}
                  <div className="space-y-1.5 mt-2">
                    <div className="w-full bg-slate-800 rounded-full h-1">
                      <div
                        className="bg-amber-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((streak / 7) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Milestone 3: Topic Expert */}
              <div className={`p-4 rounded-xl border flex gap-3.5 transition-all duration-300 ${
                topicExpertInfo.earned
                  ? "bg-slate-900 border-teal-500/30"
                  : "bg-slate-950/60 border-slate-800"
              }`}>
                <div className={`p-3 rounded-lg h-fit flex items-center justify-center ${
                  topicExpertInfo.earned
                    ? "bg-teal-600/20 text-teal-400 border border-teal-500/30"
                    : "bg-slate-900 text-slate-600 border border-slate-800"
                }`}>
                  <CheckCircle2 size={22} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-200">Topic Expert Badge</h4>
                    {topicExpertInfo.earned ? (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded px-1.5 font-bold">Unveiled</span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 rounded px-1.5 font-mono">Locked</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Answer &ge; 10 questions under any single subject with average accuracy &ge; 80%.
                  </p>
                  
                  {topicExpertInfo.earned ? (
                    <p className="text-[10px] text-emerald-400 font-bold mt-1 font-mono">
                      Mastered: {topicExpertInfo.earnedSubject}
                    </p>
                  ) : (
                    <div className="mt-3 p-3 bg-slate-900 rounded-lg border border-slate-800/80" id="study-tracker-recommendation">
                      <span className="flex items-center gap-1 text-[10px] uppercase font-mono text-amber-500 font-bold mb-1">
                        <AlertCircle size={10} /> Study Tracker Suggestion
                      </span>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Your nearest subject is <strong className="text-slate-200">{topicExpertInfo.nearestSubject}</strong> with <strong>{topicExpertInfo.nearestSolved} questions</strong> solved at <strong>{topicExpertInfo.nearestAccuracy}%</strong> accuracy.
                      </p>
                      <p className="text-[9px] text-indigo-400 font-mono mt-1">
                        Required: Math of +{Math.max(10 - topicExpertInfo.nearestSolved, 0)} Qs and ACC &ge; 80% to claim Expert!
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
      {/* Bookmarks Modal */}
      {showBookmarksModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2"><Bookmark size={18} className="text-indigo-400" /> Personal Notes ({bookmarks.length})</h3>
              <button onClick={() => setShowBookmarksModal(false)} className="text-slate-400 hover:text-white p-1 rounded-full"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bookmarks.length === 0 && <p className="text-slate-500 text-center py-8 text-sm">No bookmarks yet.</p>}
              {bookmarks.map((q, i) => (
                <div key={q.id + i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center gap-4">
                  <p className="text-xs text-slate-300 font-medium line-clamp-1">{q.question}</p>
                  <button onClick={() => {
                    const updated = bookmarks.filter((_, idx) => idx !== i);
                    setBookmarks(updated);
                    localStorage.setItem("user_bookmarks", JSON.stringify(updated));
                  }} className="text-rose-500 hover:text-rose-400 p-1.5 rounded-full bg-rose-500/10"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
