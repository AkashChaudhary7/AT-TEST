/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { MistakeBookItem } from "../types";
import { setItem } from "../lib/db";
import { calculateNextReview } from "../lib/leitner";
import {
  Search,
  Flag,
  CheckCircle,
  AlertTriangle,
  Bookmark,
  Trash2,
  FileText,
  BookmarkPlus,
  RefreshCw,
  FolderOpen,
  Filter,
  Check
} from "lucide-react";

interface MistakeBookViewProps {
  mistakeItems: MistakeBookItem[];
  setMistakeItems: (items: MistakeBookItem[]) => void;
  activeExam: string;
}

export default function MistakeBookView({
  mistakeItems,
  setMistakeItems,
  activeExam
}: MistakeBookViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [activeNoteText, setActiveNoteText] = useState<Record<string, string>>({});
  const [resolveSuccessMsg, setResolveSuccessMsg] = useState<string | null>(null);

  // Extract unique subjects from mistake list
  const availableSubjects = Array.from(new Set(mistakeItems.map(m => m.subject)));

  // Resolve / Clear item once mastered
  const handleResolveItem = async (id: string, qText: string) => {
    const updated = mistakeItems.filter(item => item.id !== id);
    setMistakeItems(updated);
    await setItem("mistake_book", updated);
    triggerSuccessAlert(`Resolved! Removed "${qText.substring(0, 35)}..." from mistake registries.`);
  };

  const handleReviewItem = async (id: string, isCorrect: boolean) => {
    const updated = mistakeItems.map(item => {
      if (item.id === id) {
        const box = item.leitnerBox || 1;
        const { box: nextBox, nextReview } = calculateNextReview(box, isCorrect);
        return {
          ...item,
          leitnerBox: nextBox,
          nextReviewDate: nextReview,
          lastReviewedAt: new Date().toISOString()
        };
      }
      return item;
    });
    setMistakeItems(updated);
    await setItem("mistake_book", updated);
    triggerSuccessAlert(isCorrect ? "Mastery increased! Box updated." : "Needs more review. Box adjusted.");
  };

  const triggerSuccessAlert = (msg: string) => {
    setResolveSuccessMsg(msg);
    setTimeout(() => {
      setResolveSuccessMsg(null);
    }, 3000);
  };

  // Flag toggle
  const handleToggleFlag = async (id: string) => {
    const updated = mistakeItems.map(item => {
      if (item.id === id) {
        return { ...item, isFlagged: !item.isFlagged };
      }
      return item;
    });
    setMistakeItems(updated);
    await setItem("mistake_book", updated);
  };

  // Save customized sticky study notes
  const handleSaveStickyNotes = async (id: string) => {
    const noteText = activeNoteText[id];
    if (noteText === undefined) return;

    const updated = mistakeItems.map(item => {
      if (item.id === id) {
        return { ...item, userNotes: noteText };
      }
      return item;
    });
    setMistakeItems(updated);
    await setItem("mistake_book", updated);
    triggerSuccessAlert("Sticky study cue updated and saved locally.");
  };

  // Filters logic
  const filteredMistakes = mistakeItems.filter(item => {
    const matchesSearch = 
      item.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.userNotes && item.userNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSubject = selectedSubject === "All Subjects" || item.subject === selectedSubject;
    const matchesFlag = !onlyFlagged || item.isFlagged;

    return matchesSearch && matchesSubject && matchesFlag;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="mistake-book-workspace">
      
      {/* Toast resolve feedbacks */}
      {resolveSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-55 flex items-center gap-3 bg-indigo-600 text-slate-100 px-5 py-3 rounded-xl shadow-lg border border-indigo-500/20 text-xs font-semibold animate-slide-up">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{resolveSuccessMsg}</span>
        </div>
      )}

      {/* Header bar and controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-slate-200">
            Smart Mistakes Book & Spaced Repetition
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            A secure log containing wrong attempts. Review errors, append personalized study cues, and resolve items once mastered.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2" id="mistakes-filter-system">
          
          {/* Search bar */}
          <div className="md:col-span-5 relative flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3.5">
            <Search size={16} className="text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent border-none text-slate-200 py-2.5 text-xs focus:outline-none outline-none"
              placeholder="Search mistakes, topics, or custom notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Subject selections */}
          <div className="md:col-span-3 flex items-center bg-slate-950 rounded-lg border border-slate-850 px-3.5">
            <Filter size={15} className="text-slate-500 mr-2 shrink-0" />
            <select
              className="w-full bg-transparent border-none text-slate-200 py-2 text-xs focus:outline-none outline-none cursor-pointer"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="All Subjects">All Subjects</option>
              {availableSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Flag filter button toggle */}
          <div className="md:col-span-4 flex items-center gap-3">
            <button
              onClick={() => setOnlyFlagged(!onlyFlagged)}
              className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold font-mono tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                onlyFlagged
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700"
              }`}
            >
              <Flag size={14} className={onlyFlagged ? "fill-amber-400" : ""} />
              Only flagged reviewers
            </button>
            
            <div className="bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-850 text-xs font-mono text-slate-400 flex items-center shrink-0">
              Logged mistakes: <strong className="text-indigo-400 ml-1.5">{mistakeItems.length}</strong>
            </div>
          </div>

        </div>
      </div>

      {/* Mistakes Book Vertical Stack */}
      {filteredMistakes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 px-4 text-center space-y-4" id="empty-lessons-pane">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-slate-700 border border-slate-850">
            <FolderOpen size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-350">Mistakes Book represents pristine blank states</h3>
            <p className="text-xs text-slate-550 max-w-sm mx-auto">
              {mistakeItems.length === 0 
                ? "Excellent job! No mistakes have been recorded yet. Start practice sets under Practice Arena 🏠 and test your accuracy."
                : "No matching items comply with active search filters. Readjust parameters above!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="mistakes-bento-layout">
          {filteredMistakes.map((item) => {
            const tempVal = activeNoteText[item.id] !== undefined ? activeNoteText[item.id] : (item.userNotes || "");

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between bg-slate-900 border rounded-2xl p-5 md:p-6 transition-all duration-200 relative ${
                  item.isFlagged
                    ? "border-amber-500/40 shadow-md shadow-amber-500/5 bg-slate-900"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Category level breadcrumbs */}
                  <div className="flex justify-between items-start gap-4 mb-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{item.subject}</span>
                      <span>•</span>
                      <span>{item.topic}</span>
                    </div>

                    {/* Flag and Resolve Quick Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFlag(item.id)}
                        className={`p-1.5 rounded-lg border transition ${
                          item.isFlagged
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                            : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-300"
                        }`}
                        title={item.isFlagged ? "Remove Review Flag" : "Flag For Immediate Review"}
                      >
                        <Flag size={13} className={item.isFlagged ? "fill-amber-500" : ""} />
                      </button>

                      <button
                        onClick={() => handleReviewItem(item.id, true)}
                        className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition"
                        title="Recalled correctly"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => handleReviewItem(item.id, false)}
                        className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition"
                        title="Need review"
                      >
                        <RefreshCw size={13} />
                      </button>
                      <button
                        onClick={() => handleResolveItem(item.id, item.questionText)}
                        className="p-1.5 rounded-lg border border-slate-850 bg-slate-950 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 transition"
                        title="Mastered & resolved - Clear mistake"
                      >
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Question Title */}
                  <h3 className="text-sm font-bold text-slate-100 leading-relaxed mb-4">
                    {item.questionText}
                  </h3>

                  {/* Answers visualizer: Selected Vs Correct */}
                  <div className="space-y-2.5 mb-4" id="mistake-item-options-distribution">
                    
                    {/* Selected option - RED */}
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left flex items-start gap-3">
                      <span className="w-6 h-6 rounded bg-rose-500 text-slate-100 flex items-center justify-center text-[10px] font-bold font-mono tracking-wider shrink-0">
                        {String.fromCharCode(65 + item.selectedOptionIndex)}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-mono tracking-wide text-rose-400 font-bold">Your incorrect selection</p>
                        <p className="text-xs font-semibold text-slate-300 leading-snug">{item.options[item.selectedOptionIndex]}</p>
                      </div>
                    </div>

                    {/* Correct option - GREEN */}
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left flex items-start gap-3">
                      <span className="w-6 h-6 rounded bg-emerald-500 text-slate-900 flex items-center justify-center text-[10px] font-bold font-mono tracking-wider shrink-0">
                        {String.fromCharCode(65 + item.correctOptionIndex)}
                      </span>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-mono tracking-wide text-emerald-400 font-bold">Official key correct answer</p>
                        <p className="text-xs font-semibold text-slate-300 leading-snug">{item.options[item.correctOptionIndex]}</p>
                      </div>
                    </div>

                  </div>

                  {/* Rationale explanation text */}
                  <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl mb-4 space-y-1 text-xs">
                    <p className="text-[10px] font-mono uppercase text-indigo-400 font-bold flex items-center gap-1">
                      <FileText size={10} /> Explanation solution & guidelines
                    </p>
                    <p className="text-slate-300 leading-relaxed font-normal">
                      {item.explanation}
                    </p>
                  </div>
                </div>

                {/* Personalized study sticky note */}
                <div className="border-t border-slate-800/80 pt-4 mt-2 space-y-2" id="mistake-item-notes-section">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-bold">Personalized Notes Cue</label>
                    {tempVal !== (item.userNotes || "") && (
                      <button
                        onClick={() => handleSaveStickyNotes(item.id)}
                        className="text-[9px] font-bold bg-indigo-600 text-slate-100 px-2 py-0.5 rounded shadow hover:bg-indigo-500 transition"
                      >
                        Save Note Change
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-[11px] text-slate-300 placeholder-slate-600 rounded-lg p-2.5 outline-none focus:outline-none focus:border-indigo-500/60 font-sans leading-relaxed resize-none"
                    placeholder="Type sticky insights, formulas, reminders, or memory aids for spaced retention drilling..."
                    value={tempVal}
                    onChange={(e) => setActiveNoteText({ ...activeNoteText, [item.id]: e.target.value })}
                  />
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
