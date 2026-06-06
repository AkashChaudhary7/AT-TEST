import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import * as Lucide from 'lucide-react';

interface DailyStudyGoalProps {
  questionsSolvedToday: number;
  streakCount: number;
}

export const DailyStudyGoal: React.FC<DailyStudyGoalProps> = ({ questionsSolvedToday, streakCount }) => {
  const [goal, setGoal] = useState<number>(() => {
     const savedGoal = localStorage.getItem('daily_study_goal');
     return savedGoal ? parseInt(savedGoal) : 10;
  });

  const [lastReachedGoal, setLastReachedGoal] = useState<boolean>(false);

  useEffect(() => {
    // Only confetti if just crossed the goal today
    if (questionsSolvedToday >= goal && questionsSolvedToday > 0 && !lastReachedGoal) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      setLastReachedGoal(true);
    } else if (questionsSolvedToday < goal) {
        setLastReachedGoal(false);
    }
  }, [questionsSolvedToday, goal, lastReachedGoal]);
  
  useEffect(() => {
    localStorage.setItem('daily_study_goal', goal.toString());
  }, [goal]);

  const progress = Math.min((questionsSolvedToday / goal) * 100, 100);
  const streakGoal = 7;
  const streakProgress = Math.min((streakCount / streakGoal) * 100, 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
               <Lucide.Target size={18} className="text-indigo-400" /> Daily Study Goal
            </h3>
            <div className="flex items-center gap-2">
                <button onClick={() => setGoal(Math.max(1, goal - 5))} className="p-1 text-slate-500 hover:text-slate-300">
                    <Lucide.Minus size={14} />
                </button>
                <span className="text-xl font-black text-indigo-400">{goal}</span>
                <button onClick={() => setGoal(goal + 5)} className="p-1 text-slate-500 hover:text-slate-300">
                    <Lucide.Plus size={14} />
                </button>
            </div>
        </div>
        
        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
            <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
            />
        </div>
        
        <p className="text-sm text-slate-400 flex items-center gap-2">
            {questionsSolvedToday >= goal ? <Lucide.CheckCircle className="text-emerald-500" size={16}/> : null}
            {questionsSolvedToday} / {goal} questions answered today
        </p>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
               <Lucide.Zap size={18} className="text-amber-500" /> Streak Achievement
            </h3>
            <span className="text-lg font-black text-amber-500">{streakCount} Days</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
            <div 
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                style={{ width: `${streakProgress}%` }}
            />
        </div>
        <p className="text-xs text-slate-500 font-mono">
            {streakCount >= streakGoal ? "Streak goal achieved! Keep it up!" : `${streakGoal - streakCount} more days to reach the 7-day streak!`}
        </p>
      </div>
    </div>
  );
};
