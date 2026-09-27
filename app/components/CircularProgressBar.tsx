'use client';

import React from 'react';

interface CircularProgressBarProps {
  percentage: number;
  amountOwed: number;
  compact?: boolean;
}

export const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percentage,
  amountOwed,
  compact = false,
}) => {
  const radius = compact ? 54 : 70;
  const stroke = compact ? 8 : 10;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  let gradientId = 'amberGradient';
  let statusText = 'In Progress';
  let statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';

  if (clampedPercentage >= 100) {
    gradientId = 'greenGradient';
    statusText = '100% Cleared';
    statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (clampedPercentage < 50) {
    gradientId = 'redGradient';
    statusText = 'Settlement Due';
    statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  return (
    <div className={`flex flex-col items-center justify-center bg-card rounded-2xl border border-border/80 shadow-xs transition-all h-full ${
      compact ? 'p-4' : 'p-5 sm:p-6'
    }`}>
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 filter drop-shadow-xs"
        >
          <defs>
            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-muted/60"
          />
          <circle
            stroke={`url(#${gradientId})`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute flex flex-col items-center text-foreground select-none">
          <span className={`font-black tracking-tight ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {Math.round(clampedPercentage)}%
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest -mt-1">
            Settled
          </span>
        </div>
      </div>

      <div className="mt-3.5 text-center space-y-1.5 w-full">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
          {statusText}
        </span>
        {amountOwed > 0 && (
          <div className="text-xs text-muted-foreground pt-1">
            <span>Owing: </span>
            <span className="font-bold text-rose-600 dark:text-rose-400">₦{amountOwed.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};