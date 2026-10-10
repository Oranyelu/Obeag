'use client';

import React, { useState } from 'react';
import { launchPaystackPayment } from '@/app/lib/paystackClient';

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  currentWalletBalance: number;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

export default function FundWalletModal({
  isOpen,
  onClose,
  userEmail,
  currentWalletBalance,
  onSuccess,
}: FundWalletModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5000);
  const [customAmount, setCustomAmount] = useState<string>('5000');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAmountNum = parseFloat(customAmount) || 0;
  const projectedBalance = currentWalletBalance + currentAmountNum;

  const handleSelectPreset = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount(amount.toString());
    setErrorMessage(null);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (PRESET_AMOUNTS.includes(parsed)) {
      setSelectedPreset(parsed);
    } else {
      setSelectedPreset(null);
    }
    setErrorMessage(null);
  };

  const handleProceed = async () => {
    if (currentAmountNum < 100) {
      setErrorMessage('Minimum wallet funding amount is ₦100');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'WALLET_FUNDING',
          amount: currentAmountNum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.notConfigured) {
          setErrorMessage('Paystack is not configured yet. Please configure your PAYSTACK_SECRET_KEY in the server .env file.');
        } else {
          setErrorMessage(data.error || 'Failed to initialize Paystack transaction');
        }
        setIsLoading(false);
        return;
      }

      // Launch Paystack (Popup or redirect)
      await launchPaystackPayment({
        authorizationUrl: data.authorizationUrl,
        accessCode: data.accessCode,
        reference: data.reference,
        email: userEmail,
        amountInNaira: currentAmountNum,
        onSuccess: async (ref) => {
          setIsLoading(false);
          onClose();
          if (onSuccess) onSuccess();
          window.location.href = `/payment/callback?reference=${encodeURIComponent(ref)}`;
        },
        onClose: () => {
          setIsLoading(false);
        },
      });

    } catch (err: unknown) {
      console.error('Wallet funding error:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog */}
      <div className="bg-card border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-7 max-w-md w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 space-y-5">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg font-bold">
              💳
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-foreground">Fund Your Wallet</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Top up online via Paystack</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Balance Preview Card */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Current Balance
            </span>
            <span className="text-base font-black text-foreground block mt-0.5">
              ₦{currentWalletBalance.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
              After Funding
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
              ₦{projectedBalance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Preset Amounts Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Quick Select Amount
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = selectedPreset === amt;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleSelectPreset(amt)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card border-border hover:border-primary/40 text-foreground hover:bg-muted/30'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Amount Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Or Enter Custom Amount (₦)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
              ₦
            </span>
            <input
              type="number"
              min="100"
              step="100"
              value={customAmount}
              onChange={handleCustomChange}
              placeholder="e.g. 15000"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Minimum funding: ₦100 • Zero wallet maintenance fees
          </p>
        </div>

        {/* Paystack Trust Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="text-emerald-600 dark:text-emerald-400">🔒</span>
            Secured by Paystack
          </span>
          <span className="text-[10px]">Cards, USSD & Bank Transfers</span>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading || currentAmountNum < 100}
            onClick={handleProceed}
            className="flex-1 py-3 px-4 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Opening Paystack...</span>
              </>
            ) : (
              <>
                <span>Pay ₦{currentAmountNum.toLocaleString()}</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
