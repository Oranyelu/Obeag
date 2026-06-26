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

  let gradientId = 'amberGradient';
  if (percentage >= 100) gradientId = 'greenGradient';
  else if (percentage < 50) gradientId = 'redGradient';

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-2xl shadow-lg border border-border/80">
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 filter drop-shadow-md"
        >
          <defs>
            <linearGradient id="amberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
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
        <div className="absolute flex flex-col items-center text-foreground">
          <span className="text-3xl font-extrabold tracking-tight">{Math.round(percentage)}%</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</span>
        </div>
      </div>
      
      <div className="mt-6 text-center space-y-2 w-full">
        <div className="flex justify-between w-full max-w-[200px] mx-auto text-sm">
          <span className="text-muted-foreground font-medium">Total Paid:</span>
          <span className="font-bold text-green-600">₦{totalPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between w-full max-w-[200px] mx-auto text-sm border-t border-border/50 pt-2">
          <span className="text-muted-foreground font-medium">Amount Owed:</span>
          <span className="font-bold text-red-500">₦{amountOwed.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};