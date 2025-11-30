'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().optional(),
  date: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  description?: string;
}

interface FinanceData {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  incomeByGroup: Record<string, number>;
  expenses: Expense[];
}

export default function FinancesPage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
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

  const onSubmit = async (formData: ExpenseForm) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        reset();
        fetchFinances(); // Refresh data
      } else {
        alert('Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading financial records...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-primary">Financial Records</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Income</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{data.totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{data.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Net Balance</h3>
          <p className={`mt-2 text-3xl font-bold ${data.netBalance >= 0 ? 'text-primary' : 'text-red-600'}`}>
            {data.netBalance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Breakdown */}
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Income Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(data.incomeByGroup).map(([type, amount]) => (
              <div key={type} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="font-medium text-foreground">{type}</span>
                <span className="font-bold text-green-600">{amount.toLocaleString()}</span>
              </div>
            ))}
            {Object.keys(data.incomeByGroup).length === 0 && (
              <p className="text-muted-foreground text-center py-4">No income recorded yet.</p>
            )}
          </div>
        </div>

        {/* Add Expense Form */}
        <div className="bg-card p-6 rounded-xl shadow-md border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Record Expense</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Title</label>
              <input
                {...register('title')}
                type="text"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                placeholder="e.g., Hall Rental"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground">Amount ()</label>
                <input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground">Date</label>
                <input
                  {...register('date')}
                  type="date"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Description (Optional)</label>
              <textarea
                {...register('description')}
                rows={2}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition"
            >
              {submitting ? 'Recording...' : 'Add Expense'}
            </button>
          </form>
        </div>
      </div>

      {/* Recent Expenses List */}
      <div className="bg-card shadow-md rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Recent Expenses</h2>
        </div>
        {data.expenses.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No expenses recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {data.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {expense.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-red-600">
                      -{expense.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}