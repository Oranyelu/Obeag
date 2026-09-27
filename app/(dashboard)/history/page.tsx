'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Payment {
  id: string;
  amount: number;
  status: string; // 'PENDING' | 'COMPLETED' | 'FAILED'
  paidAt: string | null;
  submittedAt?: string;
  due: {
    title: string;
    type: string;
  };
}

export default function HistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'COMPLETED'
          ? payment.status === 'COMPLETED'
          : payment.status === 'PENDING';

      const matchesSearch =
        payment.due.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.due.type.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [payments, filterStatus, searchQuery]);

  const totalCompletedAmount = useMemo(() => {
    return payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalPendingAmount = useMemo(() => {
    return payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Pending approval';
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Audit & Reconciliation
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Payment & Settlement History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review all your verified clearances and submissions awaiting executive sign-off.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card/80 text-foreground font-semibold text-sm hover:bg-muted/70 transition shadow-sm self-start sm:self-auto"
        >
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Settled</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            ₦{totalCompletedAmount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Confirmed by Age Grade treasury
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            ₦{totalPendingAmount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Pending admin bank confirmation
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl p-5 border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transactions</span>
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-foreground">
            {payments.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Total ledger entries recorded
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'COMPLETED', 'PENDING'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {status === 'ALL' ? 'All Records' : status === 'COMPLETED' ? 'Settled / Approved' : 'Under Review'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
          />
          <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading payment records...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">No payment records found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            {searchQuery || filterStatus !== 'ALL'
              ? 'Try adjusting your search query or status filter to see other records.'
              : 'You have not submitted any dues payments yet. When you settle dues, they will be tracked here.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (Visible on small screens) */}
          <div className="block md:hidden space-y-3">
            {filteredPayments.map((payment) => {
              const isApproved = payment.status === 'COMPLETED';
              const displayDate = formatDate(payment.paidAt || payment.submittedAt);

              return (
                <div
                  key={payment.id}
                  className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm hover:border-primary/40 transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-secondary text-secondary-foreground">
                        {payment.due.type}
                      </span>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {payment.due.title}
                      </h4>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      {isApproved ? 'Settled' : 'Pending Review'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    <div className="text-muted-foreground">
                      <span>{isApproved ? 'Approved: ' : 'Submitted: '}</span>
                      <span className="font-semibold text-foreground">{displayDate}</span>
                    </div>
                    <div className="text-base font-black text-foreground">
                      ₦{payment.amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (Visible on tablet and desktop) */}
          <div className="hidden md:block bg-card shadow-sm rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Due Item
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPayments.map((payment) => {
                    const isApproved = payment.status === 'COMPLETED';
                    const displayDate = formatDate(payment.paidAt || payment.submittedAt);

                    return (
                      <tr key={payment.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                          {displayDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                          {payment.due.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <span className="bg-secondary/70 text-secondary-foreground px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider">
                            {payment.due.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-foreground">
                          ₦{payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              isApproved
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                            {isApproved ? 'Approved / Settled' : 'Pending Verification'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}