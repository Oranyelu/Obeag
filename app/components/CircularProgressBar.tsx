'use client';

import React from 'react';

interface CircularProgressBarProps {
  percentage: number;
  totalPaid: number;
  amountOwed: number;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percentage,
  totalPaid,
  amountOwed,
}) => {
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = 'text-red-500';
  if (percentage >= 100) color = 'text-green-500';
  else if (percentage >= 50) color = 'text-yellow-500';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-xl shadow-lg border border-border">
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-muted"
          />
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={color}
          />
        </svg>
        <div className="absolute flex flex-col items-center text-foreground">
          <span className="text-3xl font-bold">{Math.round(percentage)}%</span>
          <span className="text-sm text-muted-foreground">Paid</span>
        </div>
      </div>
      
      <div className="mt-6 text-center space-y-2">
        <div className="flex justify-between w-full max-w-[200px] text-sm">
          <span className="text-muted-foreground">Paid:</span>
          <span className="font-semibold text-green-600">{totalPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between w-full max-w-[200px] text-sm">
          <span className="text-muted-foreground">Owed:</span>
          <span className="font-semibold text-red-500">{amountOwed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};