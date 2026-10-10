'use client';

import React, { useEffect, useState } from 'react';

interface WalletTx {
  id: string;
  amount: number;
  type: string; // "CREDIT" or "DEBIT"
  purpose: string;
  channel: string;
  reference?: string | null;
  status: string;
  description?: string | null;
  createdAt: string;
}

interface WalletHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
}

export default function WalletHistoryModal({
  isOpen,
  onClose,
  walletBalance,
}: WalletHistoryModalProps) {
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/wallet/transactions');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch (err) {
        console.error('Failed to load wallet transactions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="bg-card border border-border/80 shadow-2xl rounded-3xl p-6 sm:p-7 max-w-lg w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 space-y-5 max-h-[85vh] flex flex-col">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">👛</span>
              <h3 className="text-lg sm:text-xl font-black text-foreground">Wallet Transaction History</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Available Credit: <strong className="text-foreground">₦{walletBalance.toLocaleString()}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transactions List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {isLoading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-muted-foreground">Loading transaction records...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-xl">
                💳
              </div>
              <p className="text-xs font-semibold text-foreground">No wallet transactions recorded yet.</p>
              <p className="text-[11px] max-w-xs mx-auto">
                Fund your wallet to quickly settle upcoming monthly and occasional dues online.
              </p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isCredit = tx.type === 'CREDIT';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                        isCredit
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {isCredit ? '↓' : '↑'}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block truncate">
                        {tx.description || (isCredit ? 'Wallet Funding' : 'Dues Settlement')}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • via {tx.channel}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span
                      className={`font-black text-sm block ${
                        isCredit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </span>
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                        tx.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : tx.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-border/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
