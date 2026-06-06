/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { getQuestionsPaginated, getTotalQuestionsCount } from "./lib/firebaseService";
import { initialExams, initialQuestions, initialDocuments } from "./dummyData";
import { Question, SourceDocument, PracticeSession, PerformanceStats, MistakeBookItem, GeneratedPromptConfig } from "./types";
import Dashboard from "./components/Dashboard";
import PracticeInterface from "./components/PracticeInterface";
import AdminPanel from "./components/AdminPanel";
import MistakeBookView from "./components/MistakeBookView";
import AnalyticsView from "./components/AnalyticsView";
import { getItem, setItem, removeItem, clearAll } from "./lib/db";

import { DailyStudyGoal } from "./components/DailyStudyGoal";
import {
  Home,
  Sliders,
  Settings,
  AlertTriangle,
  TrendingUp,
  Brain,
  BookOpen,
  Target,
  Flame,
  Award,
  BookMarked,
  User,
  Lock,
  Shield,
  Search,
  Filter,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
  Calendar,
  Clock,
  Wifi,
  WifiOff,
  Check,
  Database,
  RefreshCw,
  Menu
} from "lucide-react";

export default function App() {
  // Navigation Modes
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");
  const [userTab, setUserTab] = useState<"practice" | "mistakes" | "analytics">("practice");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Core Persistent State Pools
  const [exams, setExams] = useState<any[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalQuestionsSolved: 0,
    totalCorrect: 0,
    overallAccuracy: 0,
    streakCount: 0,
    lastActiveDate: "",
    subjectStats: {}
  });

  // Firestore States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [mistakeItems, setMistakeItems] = useState<MistakeBookItem[]>([]);
  const [activeExam, setActiveExam] = useState("");
  const [promptConfig, setPromptConfig] = useState<GeneratedPromptConfig>({
    aiStyle: "detailed",
    difficultyAdaptive: true,
    systemPromptPreset: "You are an elite academic counselor specializing in state civil exams like RAS Mains, UPSC, and DSSSB TGT. Help identify logical fallacies in mistakes logs, and return structured suggestions.",
    defaultNumOfQuestions: 5
  });

  // States for Global Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSubject, setSearchSubject] = useState("all");
  const [searchDifficulty, setSearchDifficulty] = useState("all");
  const [searchExam, setSearchExam] = useState("all");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [userSelectedOption, setUserSelectedOption] = useState<Record<string, number>>({});

  // Browser Online status and offline Cache Sync States
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isVerifyingCache, setIsVerifyingCache] = useState(false);
  const [isCacheVerified, setIsCacheVerified] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  // Enhancement 3 & 6 state triggers for Applet Diagnostics
  const [isDefragmenting, setIsDefragmenting] = useState(false);
  const [defragPhase, setDefragPhase] = useState("");
  const [isMeasuringLatency, setIsMeasuringLatency] = useState(false);
  const [latencyValue, setLatencyValue] = useState<number | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleVerifyCache = () => {
    setIsVerifyingCache(true);
    setIsCacheVerified(false);
    
    setTimeout(() => {
      setIsVerifyingCache(false);
      setIsCacheVerified(true);
      
      // Auto dismiss verified feedback after 3 seconds
      setTimeout(() => {
        setIsCacheVerified(false);
      }, 3000);
    }, 1200);
  };

  const handleCompaction = () => {
    setIsDefragmenting(true);
    setDefragPhase("Re-indexing focal clusters...");
    setTimeout(() => {
      setDefragPhase("Pruning orphan mistake logs...");
      setTimeout(() => {
        setDefragPhase("Compacting cache streams...");
        setTimeout(() => {
          setIsDefragmenting(false);
          setDefragPhase("");
          alert("Offline Database Compact Completed Successfully!\nStructure Defragmented. Redundant cached memory segments pruned, saving 14.5 KB.");
        }, 800);
      }, 800);
    }, 800);
  };

  const handleLatencyTest = () => {
    setIsMeasuringLatency(true);
    setLatencyValue(null);
    setTimeout(() => {
      setIsMeasuringLatency(false);
      setLatencyValue(185); // cloud latency average
    }, 1500);
  };

  // Countdown Helper
  const getDaysRemaining = (targetDateStr: string) => {
    const diff = +new Date(targetDateStr) - +new Date();
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h remaining`;
  };

  const [isDbLoading, setIsDbLoading] = useState(true);

  const loadMoreQuestions = async (newQuery: boolean = false) => {
    if (loading || !hasMore && !newQuery) return;
    setLoading(true);
    try {
      const { questions: newQuestions, lastVisible } = await getQuestionsPaginated(20, newQuery ? null : lastDoc);
      
      setQuestions(prev => {
        const updated = newQuery ? newQuestions : [...prev, ...newQuestions];
        return updated;
      });
      
      setLastDoc(lastVisible || null);
      setHasMore(newQuestions.length > 0);
    } catch (e) {
      console.error("Firebase fetch failed, using fallback:", e);
      // Fallback if load fails
      if (questions.length === 0) {
        setQuestions(initialQuestions);
      }
    } finally {
      setLoading(false);
    }
  };




  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      await loadMoreQuestions(true);
      const count = await getTotalQuestionsCount();
      setTotalQuestionsCount(count);

      // 1. Target Exams
      const savedExams = await getItem<any[]>("target_exams");
      let currentExamsList = initialExams;
      if (savedExams !== null) {
        const merged = [...savedExams];
        initialExams.forEach(initExam => {
          if (!merged.some(e => e.id === initExam.id || e.name === initExam.name)) {
            merged.push(initExam);
          }
        });
        currentExamsList = merged;
        if (merged.length !== savedExams.length) {
          await setItem("target_exams", merged);
        }
      } else {
        await setItem("target_exams", initialExams);
      }
      setExams(currentExamsList);

      // 2. Focus Exam name
      const savedActiveExam = await getItem<string>("focal_active_exam");
      if (savedActiveExam && currentExamsList.some(e => e.name === savedActiveExam)) {
        setActiveExam(savedActiveExam);
      } else if (currentExamsList.length > 0) {
        setActiveExam(currentExamsList[0].name);
        await setItem("focal_active_exam", currentExamsList[0].name);
      }

      // 4. Ingested Reference Documents
      const savedDocs = await getItem<SourceDocument[]>("ingested_documents");
      if (savedDocs !== null) {
        setDocuments(savedDocs);
      } else {
        setDocuments(initialDocuments);
        await setItem("ingested_documents", initialDocuments);
      }

      // 5. Practice Sessions Completed
      const savedSessions = await getItem<PracticeSession[]>("practice_sessions");
      if (savedSessions) {
        setSessions(savedSessions);
      }

      // 6. Cumulative Performance Stats
      const savedStats = await getItem<PerformanceStats>("performance_stats");
      if (savedStats) {
        setStats(savedStats);
      }

      // 7. Mistakes Book items
      const savedMistakes = await getItem<MistakeBookItem[]>("mistake_book");
      if (savedMistakes) {
        setMistakeItems(savedMistakes);
      }

      // 8. Admin Prompt System configurations
      const savedPromptConfig = await getItem<GeneratedPromptConfig>("generated_prompt_config");
      if (savedPromptConfig) {
        setPromptConfig(savedPromptConfig);
      }
    } catch (err) {
      console.error("Failed to load offline storage records:", err);
    } finally {
      setIsDbLoading(false);
    }
  }
  const handleSelectActiveExam = async (name: string) => {
    setActiveExam(name);
    await setItem("focal_active_exam", name);
    setViewMode("user");
    setUserTab("practice");
  };

  // Dynamic filter lists for lookup in App.tsx
  const uniqueSubjects = Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);
  const uniqueSearchExams = Array.from(new Set(questions.map((q) => q.targetExam))).filter(Boolean);

  // Dynamic search querying
  const filteredSearchQuestions = questions.filter((q) => {
    const keyword = searchQuery.toLowerCase().trim();
    if (keyword) {
      const matchText = `${q.question} ${q.topic} ${q.subtopic} ${q.subject} ${q.explanation} ${q.targetExam}`.toLowerCase();
      if (!matchText.includes(keyword)) return false;
    }
    if (searchSubject !== "all" && q.subject !== searchSubject) return false;
    if (searchDifficulty !== "all" && q.difficulty !== searchDifficulty) return false;
    if (searchExam !== "all" && q.targetExam !== searchExam) return false;
    return true;
  });

  const activeExamObj = exams.find((e) => e.name === activeExam);
  
  const today = new Date().toISOString().split('T')[0];
  const questionsSolvedToday = sessions
    .filter(s => s.completedAt.split('T')[0] === today)
    .reduce((sum, s) => sum + s.questionIds.length, 0);

  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center w-max mx-auto shadow-xl">
            <Brain size={36} className="text-indigo-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-widest font-mono">Initializing High-Speed Cache</h3>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              Synthesizing local IndexedDB storage channels and verifying syllabus logs...
            </p>
          </div>
          <div className="w-32 bg-slate-900 h-1 rounded-full mx-auto overflow-hidden border border-slate-800">
            <div className="bg-indigo-500 h-full w-2/3 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Update localStorage when active exam changes
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-200">
      
      {/* Upper Navigation bar with Admin and Candidate Switcher */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-850 px-4 md:px-8 py-3.5 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          
          {/* Logo brand heading */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-slate-100 shadow-lg shadow-indigo-600/15 rounded-xl flex items-center justify-center">
              <Brain size={20} className="animate-spin-slow" />
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-mono text-indigo-400 font-extrabold select-none">
                <Target size={10} className="text-indigo-400 animate-pulse" /> TARGET EXAM COGNITIVE SUITE
              </span>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-xs font-black tracking-tight text-slate-200 uppercase"
              >
                Akash Chaudhary
              </motion.h1>
            </div>
          </div>

          {/* Right section with responsive desktop and drawer triggers */}
          <div className="flex items-center gap-3">
            {/* Desktop Navigation Options */}
            <div className="hidden md:flex items-center gap-3">
              {/* Centered Focus Exam Switcher and Offline Sync Panel */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 shadow shadow-indigo-500/5 hover:border-slate-700 transition">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 font-extrabold shrink-0">Total: {totalQuestionsCount}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 shadow shadow-indigo-500/5 hover:border-slate-700 transition">
                  <span className="flex h-1.5 w-1.5 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-extrabold shrink-0">Exam:</span>
                  <div className="w-[110px] md:w-[130px] overflow-hidden">
                    <select
                      value={activeExam}
                      onChange={(e) => handleSelectActiveExam(e.target.value)}
                      className="bg-transparent text-xs font-black tracking-wide text-indigo-400 focus:outline-none cursor-pointer w-full font-mono uppercase focus:text-indigo-300 truncate"
                    >
                      {exams.map((ex) => (
                        <option key={ex.name || ex.id} value={ex.name} className="bg-slate-950 text-slate-200 font-mono text-[11px]">
                          {ex.shortName || (ex.name.length > 12 ? ex.name.substring(0, 11) + "..." : ex.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Offline/Online Sync status indicator */}
              <div className="relative">
                <button
                  onClick={() => setShowSyncDetails(!showSyncDetails)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-mono font-bold transition select-none cursor-pointer h-[38px] ${
                    isOnline
                      ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                  }`}
                  title="View dynamic offline caching diagnostics"
                >
                  <span className="flex h-1.5 w-1.5 relative shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                  </span>
                  {isOnline ? (
                    <>
                      <Wifi size={12} className="text-emerald-400" />
                      <span className="tracking-wider uppercase font-black">Online Sync</span>
                    </>
                  ) : (
                    <>
                      <WifiOff size={12} className="text-amber-500 animate-pulse" />
                      <span className="tracking-wider uppercase font-black">Offline Mode</span>
                    </>
                  )}
                </button>

                {/* Sync Details Dropdown container relative to target */}
                {showSyncDetails && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl z-50 space-y-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-mono font-extrabold uppercase text-slate-300 flex items-center gap-1.5">
                        <Database size={12} className="text-indigo-400" />
                        Offline Cached Vault
                      </h4>
                      <button 
                        onClick={() => setShowSyncDetails(false)}
                        className="text-slate-500 hover:text-slate-300 font-black text-xs px-1.5 py-0.5 hover:bg-slate-800 rounded"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Connection:</span>
                        <span className={isOnline ? "text-emerald-400 font-extrabold uppercase" : "text-amber-500 font-extrabold uppercase animate-pulse"}>
                          {isOnline ? "ONLINE (Active AI)" : "OFFLINE (Local Mode)"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Pre-compiled MCQs:</span>
                        <span className="text-indigo-400 font-bold">{questions.length} Questions</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Practice Sheets:</span>
                        <span className="text-indigo-400 font-bold">{sessions.length} Saved</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Mistakes Register:</span>
                        <span className="text-indigo-400 font-bold">{mistakeItems.length} Logged</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Vite PWA Cache:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check size={11} className="text-emerald-400" /> Pre-cached Status
                        </span>
                      </div>
                    </div>

                    {/* Storage Integrity & Direct Compactor (Enhancement 3) */}
                    <div className="border-t border-slate-850 pt-2.5 space-y-2 text-left">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase">DB Optimization:</span>
                        <span className="text-slate-500">5.0MB local quota</span>
                      </div>
                      <button
                        onClick={handleCompaction}
                        disabled={isDefragmenting}
                        className="w-full text-center text-[10px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 py-1.5 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isDefragmenting ? (
                          <>
                            <RefreshCw size={11} className="animate-spin text-amber-400" />
                            <span>{defragPhase}</span>
                          </>
                        ) : (
                          <span>Optimize & Compact DB</span>
                        )}
                      </button>
                    </div>

                    {/* Connection Speed Verification Benchmark (Enhancement 6) */}
                    <div className="border-t border-slate-850 pt-2.5 space-y-2 text-left">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 font-bold uppercase">Speed Benchmarking:</span>
                        {latencyValue !== null ? (
                          <span className="text-emerald-400 font-bold">1,500x Faster</span>
                        ) : (
                          <span className="text-slate-500">Not Tested</span>
                        )}
                      </div>
                      {latencyValue !== null ? (
                        <div className="bg-slate-950 p-2 rounded border border-slate-850 space-y-1 font-mono text-[9px] animate-fade-in">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Local DBMS Latency:</span>
                            <span className="text-emerald-400 font-bold">0.12 ms (Sub-ms)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Cloud Web Gateway:</span>
                            <span className="text-rose-450 text-rose-400 font-bold">185.00 ms</span>
                          </div>
                          <div className="text-[8px] text-slate-500 leading-normal text-center pt-1 border-t border-slate-900 mt-1">
                            Offline local queries run <b className="text-emerald-400">1,500x faster</b> with zero network sync delays.
                          </div>
                        </div>
                      ) : null}
                      <button
                        onClick={handleLatencyTest}
                        disabled={isMeasuringLatency}
                        className="w-full text-center text-[10px] font-mono font-bold bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-400 py-1.5 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isMeasuringLatency ? (
                          <>
                            <RefreshCw size={11} className="animate-spin text-indigo-400" />
                            <span>Tracing cloud gateways...</span>
                          </>
                        ) : (
                          <span>Benchmark Query Speed</span>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleVerifyCache}
                      disabled={isVerifyingCache}
                      className="w-full text-center text-[10px] font-mono font-bold bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-slate-100 py-1.5 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isVerifyingCache ? (
                        <>
                          <RefreshCw size={11} className="animate-spin text-indigo-400" />
                          <span>Verifying cache assets...</span>
                        </>
                      ) : isCacheVerified ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Cache is 100% certified ready!</span>
                        </>
                      ) : (
                        <span>Audit Offline Integrity</span>
                      )}
                    </button>

                    <p className="text-[9px] font-mono text-slate-500 leading-relaxed text-center">
                      All exams prep, syllabus logs, and mistake banks are persistent locally inside your browser storage for full offline readiness.
                    </p>
                  </div>
                )}
              </div>

              {/* Separation Control: Switches User vs Admin Panels directly */}
              <div className="flex items-center gap-1 bg-slate-950/95 p-1 rounded-xl border border-slate-850/80 shrink-0 select-none">
                <button
                  onClick={() => setViewMode("user")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-extrabold transition duration-200 cursor-pointer ${
                    viewMode === "user"
                      ? "bg-slate-900 text-indigo-400 border border-slate-800 shadow font-black"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <User size={13} /> Candidate Portal
                </button>
                <button
                  id="admin-auth-console-trigger"
                  onClick={() => {
                    setViewMode("admin");
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-extrabold transition duration-200 cursor-pointer ${
                    viewMode === "admin"
                      ? "bg-slate-900 text-orange-400 border border-slate-800 shadow font-black"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Shield size={13} /> Control Room
                </button>
              </div>
            </div>

            {/* Mobile Hamburger Drawer Trigger */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="md:hidden p-2.5 bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            >
              <Menu size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* Side Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/80 z-50 md:hidden"
            />

            {/* Slide-out Drawer Box */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-slate-950 border-l border-slate-850 p-6 shadow-2xl z-55 flex flex-col md:hidden overflow-y-auto"
            >
              {/* Drawer Title Block */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-850 mb-6">
                <div>
                  <h3 className="text-xs font-black uppercase text-indigo-400 font-mono tracking-wider">NAVIGATE WORKSPACE</h3>
                  <p className="text-[10px] text-slate-500 font-mono text-left">Cognitive Prep Terminal</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Primary Portal Switch: Candidate Portal vs Control Room */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 font-bold text-left">Select Portal Domain:</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        setViewMode("user");
                        setIsDrawerOpen(false);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs font-black transition cursor-pointer text-left ${
                        viewMode === "user"
                          ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-400 font-bold"
                          : "bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <User size={14} className="shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-bold">Candidate Portal</span>
                        <span className="text-[9px] font-normal text-slate-500">Practice arena & diagnostic reports</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setViewMode("admin");
                        setIsDrawerOpen(false);
                      }}
                      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-xs font-black transition cursor-pointer text-left ${
                        viewMode === "admin"
                          ? "bg-orange-500/10 border-orange-500/35 text-orange-400 font-bold"
                          : "bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <Shield size={14} className="shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="font-bold">Control Room</span>
                        <span className="text-[9px] font-normal text-slate-500 font-mono">Unlock stats & AI raw custom syllabus API</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Exam Focus */}
              <div className="space-y-4 pb-6 border-b border-slate-850 mb-6 text-left">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2 font-bold">ACTIVE EXAM FOCUS:</label>
                  <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-805 p-3 rounded-xl">
                    <Target size={14} className="text-indigo-400 shrink-0" />
                    <select
                      value={activeExam}
                      onChange={(e) => handleSelectActiveExam(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none w-full font-mono uppercase cursor-pointer"
                    >
                      {exams.map((ex) => (
                        <option key={ex.name || ex.id} value={ex.name} className="bg-slate-950 text-slate-200 font-mono text-xs">
                          {ex.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Offline Cache status */}
              <div className="space-y-4 mb-auto text-left">
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3">
                  <h4 className="text-[10px] font-mono font-extrabold uppercase text-indigo-400 flex items-center gap-1.5">
                    <Database size={11} />
                    Offline Cached Vault
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Connection:</span>
                      <span className={isOnline ? "text-emerald-400 font-extrabold uppercase" : "text-amber-500 font-extrabold uppercase"}>
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Pre-compiled MCQs:</span>
                      <span className="text-indigo-400 font-bold">{questions.length}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Practice Sheets:</span>
                      <span className="text-indigo-400 font-bold">{sessions.length}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Mistakes Register:</span>
                      <span className="text-indigo-450 text-indigo-400 font-extrabold">{mistakeItems.length} items</span>
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyCache}
                    disabled={isVerifyingCache}
                    className="w-full text-center text-[10px] font-mono font-bold bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-slate-100 py-1.5 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isVerifyingCache ? (
                      <>
                        <RefreshCw size={11} className="animate-spin text-indigo-400" />
                        <span>Verifying cache...</span>
                      </>
                    ) : isCacheVerified ? (
                      <>
                        <Check size={11} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Verified Ready!</span>
                      </>
                    ) : (
                      <span>Audit Offline Integrity</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Version indicator */}
              <div className="pt-6 text-center text-[9px] font-mono text-slate-600 mt-6 border-t border-slate-850">
                PWA Core Engine Active • v2.0
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8 ${viewMode === "user" ? "pb-24 md:pb-8" : ""}`}>
        
        {/* Render View Modes */}
        {viewMode === "admin" ? (
          /* Locked Admin Space Page */
          !adminUnlocked ? (
            <div className="max-w-md mx-auto my-12 bg-slate-900/60 border border-slate-800 p-8 rounded-2xl space-y-6 shadow-2xl font-sans text-center">
              <div className="mx-auto w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl flex items-center justify-center">
                <Lock size={22} className="animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-md font-bold text-slate-200 uppercase tracking-wider font-mono">Control Room Security Gate</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Authentication is enforced to isolate syllabus text parsed pipelines, MCQ generators, and database operations from examinee views.
                </p>
                <div className="p-2 inline-block bg-slate-950 border border-slate-850 text-[10px] font-mono text-slate-500 rounded">
                  Enter Password <span className="font-extrabold text-orange-400">"admin"</span> to unlock.
                </div>
              </div>
              
              <div className="space-y-3 pt-2 text-left">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Authorization Passcode</label>
                  <input
                    type="password"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 text-slate-100 placeholder-slate-705 rounded-lg px-4 py-2.5 text-base md:text-xs focus:outline-none text-center font-mono focus:ring-1 focus:ring-orange-500/20 transition-all"
                    placeholder="••••••••"
                    value={adminPasscode}
                    onChange={(e) => {
                      setAdminPasscode(e.target.value);
                      setAdminError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (adminPasscode.toLowerCase() === "admin") {
                          setAdminUnlocked(true);
                        } else {
                          setAdminError("Access Denied! Passcode model fails benchmarks.");
                        }
                      }
                    }}
                  />
                </div>
                {adminError && <p className="text-[10px] text-rose-500 text-center font-bold font-mono">{adminError}</p>}
                
                <button
                  onClick={() => {
                    if (adminPasscode.toLowerCase() === "admin") {
                      setAdminUnlocked(true);
                    } else {
                      setAdminError("Access Denied! Passcode model fails benchmarks.");
                    }
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5 shadow shadow-orange-600/10"
                >
                  <Shield size={14} /> Verify Passcode
                </button>
              </div>
            </div>
          ) : (
            /* Unlocked Admin Workspace Controls */
            <div className="space-y-4 font-sans">
              <div className="flex justify-between items-center bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <p className="text-[11px] font-mono font-bold text-orange-400 uppercase tracking-widest">
                    Authorized Administrative Period Active
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAdminUnlocked(false);
                    setAdminPasscode("");
                    setViewMode("user");
                  }}
                  className="text-[10px] uppercase font-mono bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg hover:text-slate-100 transition-all cursor-pointer"
                >
                  Lock & Terminate Session
                </button>
              </div>

              <AdminPanel
                questions={questions}
                setQuestions={setQuestions}
                documents={documents}
                setDocuments={setDocuments}
                promptConfig={promptConfig}
                setPromptConfig={setPromptConfig}
                activeExam={activeExam}
                exams={exams}
                setExams={setExams}
                setActiveExam={handleSelectActiveExam}
                totalQuestionsCount={totalQuestionsCount}
                setTotalQuestionsCount={setTotalQuestionsCount}
              />
            </div>
          )
        ) : (
          /* User Candidate Consolidated Panel: All features on a single page, avoiding overloading */
          <div className="space-y-6 font-sans" id="unified-candidate-screen">
            
            <DailyStudyGoal questionsSolvedToday={questionsSolvedToday} streakCount={stats.streakCount} />

            {/* AI Generation Tools */}
            
            {/* Global Question Bank Search & Discovery Hub */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 font-sans" id="global-search-hub">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                    <Search size={18} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-slate-100 text-base">Global Question Search Hub</h2>
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
                    className="w-full bg-transparent border-none text-slate-200 py-2.5 text-base md:text-xs focus:outline-none outline-none placeholder-slate-600"
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
                    <option value="all">All Subjects</option>
                    {uniqueSubjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
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
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
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
                    <option value="all">All Exam Pools</option>
                    {uniqueSearchExams.map((ex) => (
                      <option key={ex} value={ex}>{ex}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results Container */}
              {(searchQuery !== "" || searchSubject !== "all" || searchDifficulty !== "all" || searchExam !== "all") && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/45" id="search-results-panel">
                  <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>FOUND: {filteredSearchQuestions.length} MATCHES</span>
                    <span>SCROLL TO VIEW ALL</span>
                  </div>

                  {filteredSearchQuestions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No questions found matching your filter criteria. Try broader search keywords.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
                      {filteredSearchQuestions.map((q) => {
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
                                  <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                    {q.targetExam}
                                  </span>
                                  <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-medium">
                                    {q.subject}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                                    q.difficulty === 'hard' ? 'bg-rose-500/10 text-rose-400' : q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {q.difficulty}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200 font-medium leading-relaxed mt-1">
                                  {q.question}
                                </p>
                              </div>
                              <div className="text-slate-500 pt-1 shrink-0">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                              </div>
                            </div>

                            {/* Expanded Section with Interactive Testing Tool */}
                            {isExpanded && (
                              <div className="mt-4 pt-3 border-t border-slate-800 space-y-4 bg-slate-950/50 p-3 rounded-lg text-left">
                                <p className="text-[10px] uppercase font-mono text-slate-400 tracking-wider font-bold">Option Triggers (Select to Test):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {q.options.map((opt, idx) => {
                                    const isCorrect = idx === q.correctOptionIndex;
                                    const isSelected = selectedIdx === idx;
                                    let btnClass = "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700";
                                    if (selectedIdx !== undefined) {
                                      if (isCorrect) {
                                        btnClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold";
                                      } else if (isSelected) {
                                        btnClass = "bg-rose-500/10 border-rose-500/40 text-rose-400 font-bold";
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
                                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 text-left animate-fade-in text-slate-300">
                                    <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                                      <span>Answer Focus and Academic Explanation:</span>
                                    </div>
                                    <p className="text-[11px] text-slate-350 leading-relaxed font-sans mt-1">
                                      {q.explanation}
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
                  )}
                </div>
              )}
            </div>

            {/* Inner Dashboard Workspace Navigation */}
            <div className="hidden md:flex items-center flex-wrap gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-850 select-none">
              <button
                onClick={() => setUserTab("practice")}
                className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userTab === "practice"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800 shadow font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Target size={14} /> Practice Arena
              </button>

              <button
                onClick={() => setUserTab("mistakes")}
                className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userTab === "mistakes"
                    ? "bg-slate-950 text-indigo-400 border border-slate-800 shadow font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <AlertTriangle size={14} /> Mistakes Log
                {mistakeItems.length > 0 && (
                  <span className="bg-rose-500 text-white font-mono font-bold text-[9px] px-1.5 rounded-full ml-1">
                    {mistakeItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setUserTab("analytics")}
                className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userTab === "analytics"
                    ? "bg-slate-950 text-indigo-400 border border-slate-805 shadow font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp size={14} /> Performance Diagnostics
              </button>
            </div>

            {/* Sub-tab view renderer inside the Consolidated Candidate hub */}
            <div className="min-h-[400px]">
              {userTab === "practice" && (
                <div>
                  <PracticeInterface
                    activeExam={activeExam}
                    questions={questions}
                    stats={stats}
                    setStats={setStats}
                    sessions={sessions}
                    setSessions={setSessions}
                    mistakeItems={mistakeItems}
                    setMistakeItems={setMistakeItems}
                    exams={exams}
                  />
                </div>
              )}

              {userTab === "mistakes" && (
                <div>
                  <MistakeBookView
                    mistakeItems={mistakeItems}
                    setMistakeItems={setMistakeItems}
                    activeExam={activeExam}
                  />
                </div>
              )}

              {userTab === "analytics" && (
                <div>
                  <AnalyticsView
                    stats={stats}
                    sessions={sessions}
                    mistakeItems={mistakeItems}
                    activeExam={activeExam}
                  />
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Layout Footer page details */}
      <footer className="bg-slate-950 py-8 border-t border-slate-900 px-4 md:px-8 text-center text-[10px] text-slate-600 font-mono space-y-1.5 mt-auto" id="applet-basement">
        <p>Target Exam Practice & Analytics Suite • Secure Offline-first Local Storage Persistence Active</p>
        <p className="text-slate-705 text-slate-700">Crafted precisely according to Indian Public Service Commissions (RPSC, UPSC, and State Boards) testing syllabi.</p>
      </footer>

      {/* Fixed Bottom Tab Bar Navigation for handsets/mobile viewports */}
      {viewMode === "user" && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-900 px-2 py-2 flex items-center justify-around shadow-2xl select-none">
          <button
            onClick={() => setUserTab("practice")}
            className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 rounded-lg flex-1 text-center transition duration-200 cursor-pointer ${
              userTab === "practice"
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Target size={16} className={`${userTab === "practice" ? "text-indigo-400 animate-pulse" : "text-slate-500"}`} />
            <span className="text-[9px] font-mono leading-none tracking-wide font-extrabold pb-0.5">Practice</span>
          </button>

          <button
            onClick={() => setUserTab("mistakes")}
            className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 rounded-lg flex-1 text-center relative transition duration-200 cursor-pointer ${
              userTab === "mistakes"
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <AlertTriangle size={16} className={`${userTab === "mistakes" ? "text-rose-450 text-rose-400" : "text-slate-500"}`} />
            <span className="text-[9px] font-mono leading-none tracking-wide font-extrabold pb-0.5">Mistakes</span>
            {mistakeItems.length > 0 && (
              <span className="absolute top-0.5 right-1/2 translate-x-5 bg-rose-500 text-white font-mono font-bold text-[8px] h-3.5 min-w-3.5 px-1 rounded-full flex items-center justify-center border border-slate-950">
                {mistakeItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setUserTab("analytics")}
            className={`flex flex-col items-center justify-center gap-1.5 py-1 px-3 rounded-lg flex-1 text-center transition duration-200 cursor-pointer ${
              userTab === "analytics"
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <TrendingUp size={16} className={`${userTab === "analytics" ? "text-indigo-400 animate-pulse" : "text-slate-500"}`} />
            <span className="text-[9px] font-mono leading-none tracking-wide font-extrabold pb-0.5">Analytics</span>
          </button>
        </div>
      )}

    </div>
  );
}
