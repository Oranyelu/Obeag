'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().optional(),
  date: z.string().optional(),
});

const incomeSchema = z.object({
  title: z.string().min(1, 'Title / Purpose is required'),
  amount: z.string().min(1, 'Amount is required'),
  category: z.string().min(1, 'Category is required'),
  donor: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;
type IncomeForm = z.infer<typeof incomeSchema>;

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  description?: string;
}

interface Income {
  id: string;
  title: string;
  amount: number;
  category: string;
  donor?: string;
  date: string;
  description?: string;
  createdAt?: string;
}

interface FinanceData {
  totalIncome: number;
  duesIncome: number;
  directIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeByGroup: Record<string, number>;
  expenses: Expense[];
  incomes: Income[];
}

export default function FinancesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFormTab, setActiveFormTab] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [activeTableTab, setActiveTableTab] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: { id: string; title: string; amount: number; type: 'INCOME' | 'EXPENSE' } | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    item: null,
    isDeleting: false,
  });

  // Forms
  const expenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const incomeForm = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      title: '',
      amount: '',
      category: 'Donation',
      donor: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    fetchFinances();
  }, []);

  const fetchFinances = async () => {
    try {
      const res = await fetch('/api/admin/finances');
      if (res.ok) {
        const financeData = await res.json();
        setData(financeData);
      }
    } catch (error) {
      console.error('Failed to fetch finances', error);
    } finally {
      setLoading(false);
    }
  };

  const onExpenseSubmit = async (formData: ExpenseForm) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'EXPENSE',
          title: formData.title,
          amount: formData.amount,
          description: formData.description,
          date: formData.date,
        }),
      });

      if (res.ok) {
        expenseForm.reset({
          title: '',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        setFeedback({
          type: 'success',
          message: `Expense "${formData.title}" of ₦${Number(formData.amount).toLocaleString()} recorded successfully!`,
        });
        setActiveTableTab('EXPENSE');
        fetchFinances();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to record expense' });
      }
    } catch (error) {
      console.error('Error adding expense', error);
      setFeedback({ type: 'error', message: 'An unexpected error occurred while adding expense' });
    } finally {
      setSubmitting(false);
    }
  };

  const onIncomeSubmit = async (formData: IncomeForm) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'INCOME',
          title: formData.title,
          amount: formData.amount,
          category: formData.category,
          donor: formData.donor,
          description: formData.description,
          date: formData.date,
        }),
      });

      if (res.ok) {
        incomeForm.reset({
          title: '',
          amount: '',
          category: formData.category || 'Donation',
          donor: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
        });
        setFeedback({
          type: 'success',
          message: `Deposit / Income "${formData.title}" of ₦${Number(formData.amount).toLocaleString()} successfully recorded!`,
        });
        setActiveTableTab('INCOME');
        fetchFinances();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to record deposit' });
      }
    } catch (error) {
      console.error('Error adding deposit/income', error);
      setFeedback({ type: 'error', message: 'An unexpected error occurred while recording deposit' });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const res = await fetch(`/api/admin/finances?id=${deleteModal.item.id}&type=${deleteModal.item.type}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `${deleteModal.item.type === 'INCOME' ? 'Deposit / Income' : 'Expense'} "${deleteModal.item.title}" deleted.`,
        });
        setDeleteModal({ isOpen: false, item: null, isDeleting: false });
        fetchFinances();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete record');
        setDeleteModal(prev => ({ ...prev, isDeleting: false }));
      }
    } catch (error) {
      console.error('Failed to delete item', error);
      alert('Error deleting record');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Filtered lists
  const filteredIncomes = useMemo(() => {
    if (!data?.incomes) return [];
    if (!searchQuery.trim()) return data.incomes;
    const q = searchQuery.toLowerCase();
    return data.incomes.filter(inc => 
      inc.title.toLowerCase().includes(q) ||
      inc.category.toLowerCase().includes(q) ||
      (inc.donor && inc.donor.toLowerCase().includes(q)) ||
      (inc.description && inc.description.toLowerCase().includes(q))
    );
  }, [data?.incomes, searchQuery]);

  const filteredExpenses = useMemo(() => {
    if (!data?.expenses) return [];
    if (!searchQuery.trim()) return data.expenses;
    const q = searchQuery.toLowerCase();
    return data.expenses.filter(exp => 
      exp.title.toLowerCase().includes(q) ||
      (exp.description && exp.description.toLowerCase().includes(q))
    );
  }, [data?.expenses, searchQuery]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium text-sm">Loading financial records & ledger...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-destructive/20 text-destructive">
        <p className="font-semibold">Failed to load financial records.</p>
        <button 
          onClick={fetchFinances}
          className="mt-3 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 rounded-lg text-sm font-medium transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Financial Records</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Audit dues, track external gifts & donations, record expenses, and export complete ledger statements.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <a
            href="/api/admin/finances/export"
            download
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export Complete Ledger (CSV)
          </a>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-sm flex items-center justify-between transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
            : 'bg-destructive/10 text-destructive border border-destructive/20'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 8.25h.01" />
              </svg>
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)} 
            className="text-xs font-bold hover:underline opacity-80 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Income */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            ₦{data.totalIncome.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Dues: ₦{(data.duesIncome || 0).toLocaleString()} • Gifts: ₦{(data.directIncome || 0).toLocaleString()}
          </p>
        </div>

        {/* Gifts & Donations Card */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Gifts & Donations</span>
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-primary">
            ₦{(data.directIncome || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.incomes?.length || 0} direct deposit / gift record(s)
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
              </svg>
            </span>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
            ₦{data.totalExpenses.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.expenses?.length || 0} recorded expenditure(s)
          </p>
        </div>

        {/* Net Balance */}
        <div className="bg-card p-4 sm:p-5 rounded-2xl shadow-sm border border-border relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Balance</span>
            <span className={`p-1.5 rounded-lg ${data.netBalance >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5m-15 0V21" />
              </svg>
            </span>
          </div>
          <p className={`mt-2 text-2xl sm:text-3xl font-bold ${data.netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>
            ₦{data.netBalance.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {data.netBalance >= 0 ? 'Positive association treasury' : 'Deficit balance'}
          </p>
        </div>
      </div>

      {/* Two-Column Workspace: Left = Income Breakdown, Right = Financial Operations Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Income Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Income Breakdown</h2>
              <p className="text-xs text-muted-foreground">Revenue by category & contribution streams</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Total ₦{data.totalIncome.toLocaleString()}
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(data.incomeByGroup).map(([type, amount]) => {
              const percent = data.totalIncome > 0 ? Math.round((amount / data.totalIncome) * 100) : 0;
              const isGiftOrDonation = ['Donation', 'Gift', 'Grant', 'Sponsorship', 'Donations & Gifts', 'External Deposit'].includes(type);

              return (
                <div key={type} className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isGiftOrDonation ? 'bg-primary' : 'bg-emerald-500'}`} />
                      <span className="font-semibold text-foreground">{type}</span>
                      {isGiftOrDonation && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          External
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₦{amount.toLocaleString()}
                    </span>
                  </div>
                  {/* Visual percentage meter */}
                  <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isGiftOrDonation ? 'bg-primary' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, Math.max(percent, 3))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                    <span>{percent}% of overall income</span>
                  </div>
                </div>
              );
            })}

            {Object.keys(data.incomeByGroup).length === 0 && (
              <div className="text-muted-foreground text-center py-8 text-sm bg-muted/20 rounded-xl">
                No income recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Financial Operations Form: Add Deposit/Income OR Record Expense (7 cols) */}
        <div className="lg:col-span-7 bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          {/* Action Form Tabs */}
          <div className="p-2 sm:p-3 bg-muted/30 border-b border-border flex gap-2">
            <button
              type="button"
              onClick={() => setActiveFormTab('INCOME')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeFormTab === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Deposit / Income
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('EXPENSE')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeFormTab === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
              </svg>
              Record Expense
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {activeFormTab === 'INCOME' ? (
              /* Add Deposit / Gift / Donation Form */
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">Record Deposit or External Income</h2>
                  <p className="text-xs text-muted-foreground">
                    Log gifts, patron donations, sponsorships, grants, or direct non-dues bank deposits.
                  </p>
                </div>

                <form onSubmit={incomeForm.handleSubmit(onIncomeSubmit)} className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Title / Purpose <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...incomeForm.register('title')}
                      type="text"
                      className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      placeholder="e.g., Annual Festival Gift, Patron Donation, Building Support"
                    />
                    {incomeForm.formState.errors.title && (
                      <p className="mt-1 text-xs text-destructive">{incomeForm.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Category <span className="text-destructive">*</span>
                      </label>
                      <select
                        {...incomeForm.register('category')}
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      >
                        <option value="Donation">🤲 Donation</option>
                        <option value="Gift">🎁 Gift to Age Grade</option>
                        <option value="Sponsorship">🤝 Sponsorship</option>
                        <option value="Grant">🏛️ Grant / Endowment</option>
                        <option value="External Deposit">💰 External Bank Deposit</option>
                        <option value="Patron Levy">⭐ Patron Support</option>
                        <option value="Other Income">📌 Other Income</option>
                      </select>
                    </div>

                    {/* Donor / Source */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Donor / Source (Optional)
                      </label>
                      <input
                        {...incomeForm.register('donor')}
                        type="text"
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                        placeholder="e.g., Chief Emeka Okafor, Okwojo Diaspora"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Amount (₦) <span className="text-destructive">*</span>
                      </label>
                      <input
                        {...incomeForm.register('amount')}
                        type="number"
                        step="0.01"
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                        placeholder="0.00"
                      />
                      {incomeForm.formState.errors.amount && (
                        <p className="mt-1 text-xs text-destructive">{incomeForm.formState.errors.amount.message}</p>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Date Received
                      </label>
                      <input
                        {...incomeForm.register('date')}
                        type="date"
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Description / Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Notes / Description (Optional)
                    </label>
                    <textarea
                      {...incomeForm.register('description')}
                      rows={2}
                      className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm"
                      placeholder="e.g., Deposited to Access Bank for hall electrification"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Recording Inflow...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Record Deposit / Income</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              /* Record Expense Form */
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">Record Expense</h2>
                  <p className="text-xs text-muted-foreground">
                    Log age grade operational costs, hall rentals, catering, refreshments, or supplies.
                  </p>
                </div>

                <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Expense Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...expenseForm.register('title')}
                      type="text"
                      className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 sm:text-sm"
                      placeholder="e.g., Hall Rental, Sound System, Generator Fuel"
                    />
                    {expenseForm.formState.errors.title && (
                      <p className="mt-1 text-xs text-destructive">{expenseForm.formState.errors.title.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Amount (₦) <span className="text-destructive">*</span>
                      </label>
                      <input
                        {...expenseForm.register('amount')}
                        type="number"
                        step="0.01"
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 sm:text-sm font-semibold text-rose-600 dark:text-rose-400"
                        placeholder="0.00"
                      />
                      {expenseForm.formState.errors.amount && (
                        <p className="mt-1 text-xs text-destructive">{expenseForm.formState.errors.amount.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                        Date Incurred
                      </label>
                      <input
                        {...expenseForm.register('date')}
                        type="date"
                        className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1">
                      Description / Vendor (Optional)
                    </label>
                    <textarea
                      {...expenseForm.register('description')}
                      rows={2}
                      className="block w-full rounded-xl border border-input bg-background px-3.5 py-2 text-foreground shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 sm:text-sm"
                      placeholder="e.g., Paid to Okwojo Community Hall management for monthly meeting"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 transition cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Recording Expense...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                        <span>Record Expense</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Records Section */}
      <div className="bg-card shadow-sm rounded-2xl border border-border overflow-hidden">
        {/* Table Header with Tabs & Search */}
        <div className="p-4 sm:p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTableTab('INCOME')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTableTab === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>🎁 External Deposits & Gifts</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTableTab === 'INCOME' ? 'bg-white/20 text-white' : 'bg-muted-foreground/20 text-foreground'
              }`}>
                {data.incomes?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTableTab('EXPENSE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTableTab === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>🧾 Expenses</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTableTab === 'EXPENSE' ? 'bg-white/20 text-white' : 'bg-muted-foreground/20 text-foreground'
              }`}>
                {data.expenses?.length || 0}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTableTab === 'INCOME' ? 'Search title, donor, category...' : 'Search expense title, description...'}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        {/* Tab 1: External Deposits & Gifts Table */}
        {activeTableTab === 'INCOME' && (
          <div>
            {filteredIncomes.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {searchQuery ? 'No matching deposit records found.' : 'No external deposits or gifts recorded yet.'}
                </p>
                <p className="text-xs max-w-sm">
                  Use the &quot;Add Deposit / Income&quot; form above to log donations, gifts, or direct inflows received by the age grade.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title / Purpose</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Donor / Source</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredIncomes.map((income) => (
                      <tr key={income.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                          {new Date(income.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                          {income.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {income.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {income.donor ? (
                            <span className="font-medium text-foreground flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                {income.donor[0]?.toUpperCase()}
                              </span>
                              {income.donor}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Anonymous / General</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                          {income.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          +₦{income.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              item: { id: income.id, title: income.title, amount: income.amount, type: 'INCOME' },
                              isDeleting: false,
                            })}
                            title="Delete Deposit"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Expenses Table */}
        {activeTableTab === 'EXPENSE' && (
          <div>
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-sm">
                  {searchQuery ? 'No matching expense records found.' : 'No expenses recorded yet.'}
                </p>
                <p className="text-xs max-w-sm">
                  Use the &quot;Record Expense&quot; form above to log operational expenditures.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground font-medium">
                          {new Date(expense.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-foreground">
                          {expense.title}
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                          {expense.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-rose-600 dark:text-rose-400">
                          -₦{expense.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setDeleteModal({
                              isOpen: true,
                              item: { id: expense.id, title: expense.title, amount: expense.amount, type: 'EXPENSE' },
                              isDeleting: false,
                            })}
                            title="Delete Expense"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                Delete {deleteModal.item.type === 'INCOME' ? 'Deposit / Income' : 'Expense'}?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-foreground">&quot;{deleteModal.item.title}&quot;</span>{' '}
                (₦{deleteModal.item.amount.toLocaleString()})?
              </p>
              <p className="text-xs text-muted-foreground">
                This record will be removed and your net association balance will be updated automatically.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deleteModal.isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, item: null, isDeleting: false })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border text-foreground hover:bg-muted text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.isDeleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs sm:text-sm font-semibold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteModal.isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}