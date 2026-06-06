
import React from 'react';

interface CircularProgressBarProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = '#4f46e5', // indigo-600
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        <circle
          className="transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
      </svg>
      <div className="absolute text-[10px] font-black text-slate-200">
        {Math.round(progress)}%
      </div>
    </div>
  );
};
