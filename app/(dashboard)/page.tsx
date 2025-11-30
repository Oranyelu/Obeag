'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CircularProgressBar } from '@/app/components/CircularProgressBar';

interface Due {
  id: string;
  title: string;
  amount: number;
  originalAmount: number;
  type: string;
  dueDate: string;
  isPaid: boolean;
  isOverdue: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface DashboardData {
  dues: Due[];
  recentNotifications: Notification[];
  unreadNotificationCount: number;
  stats: {
    totalDuesAmount: number;
    totalPaidAmount: number;
    amountOwed: number;
    percentagePaid: number;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (dueId?: string) => {
    if (!confirm(dueId ? 'Pay this due?' : 'Pay off all dues?')) return;
    
    setIsPaying(true);
    try {
      const body = dueId 
        ? { dueId } 
        : { dueIds: data?.dues.filter(d => !d.isPaid).map(d => d.id) };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert('Payment successful!');
        fetchDashboardData();
      } else {
        alert('Payment failed.');
      }
    } catch (error) {
      console.error('Payment error', error);
      alert('An error occurred.');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  const unpaidDuesCount = data.dues.filter(d => !d.isPaid).length;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Welcome, {session?.user?.name || 'Member'}</h1>
          <p className="text-muted-foreground">Here is your dues summary.</p>
        </div>
        <div className="flex gap-3">
          {unpaidDuesCount > 0 && (
            <button 
              onClick={() => handlePay()}
              disabled={isPaying}
              className="bg-green-600 text-white px-6 py-2 rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50 font-semibold"
            >
              {isPaying ? 'Processing...' : 'Pay Off All Dues'}
            </button>
          )}
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:opacity-90 transition font-semibold">
              Admin Dashboard
            </Link>
          )}
        </div>
      </div>
      
      {/* Recent Notifications Hero Section */}
      {data.recentNotifications.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/20">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              Recent Updates
            </h2>
            <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentNotifications.map((notif) => (
              <div key={notif.id} className="bg-card p-4 rounded-lg shadow-sm border border-border flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground">{notif.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{notif.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Bar Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <CircularProgressBar 
            percentage={data.stats.percentagePaid} 
            totalPaid={data.stats.totalPaidAmount}
            amountOwed={data.stats.amountOwed}
          />
        </div>
        
        {/* Quick Stats / Info */}
        <div className="md:col-span-2 bg-card rounded-xl shadow-lg border border-border p-6 flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-4 text-foreground">Payment Status</h3>
          <p className="text-muted-foreground mb-4">
            You have paid <span className="font-bold text-foreground">{Math.round(data.stats.percentagePaid)}%</span> of your total dues.
            {data.stats.amountOwed > 0 
              ? ` You still owe ${data.stats.amountOwed.toLocaleString()}. Please clear your dues to avoid penalties.`
              : " Great job! You are fully paid up."}
          </p>
          <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${data.stats.percentagePaid >= 100 ? 'bg-green-500' : data.stats.percentagePaid >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${data.stats.percentagePaid}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Dues List Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Your Dues</h2>
        <div className="bg-card shadow-lg rounded-xl border border-border overflow-visible">
          <ul className="divide-y divide-border">
            {data.dues.map((due) => (
              <li key={due.id} className="hover:bg-muted/50 transition-colors">
                <div className="px-6 py-5 sm:px-8">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-primary truncate">
                            {due.title}
                          </p>
                          {due.isOverdue && !due.isPaid && (
                             <div className="group relative inline-block">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold cursor-help border border-red-200">?</span>
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                  Penalty Applied: Amount doubled due to late payment.
                                </div>
                             </div>
                          )}
                        </div>
                        <div className="text-right">
                           <p className={`ml-4 text-lg font-bold ${due.isOverdue && !due.isPaid ? 'text-red-600' : 'text-foreground'}`}>
                             {due.amount.toLocaleString()}
                           </p>
                           {due.isOverdue && !due.isPaid && (
                             <p className="text-xs text-muted-foreground line-through">
                               {due.originalAmount.toLocaleString()}
                             </p>
                           )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span className="bg-secondary px-2 py-1 rounded text-xs font-medium uppercase tracking-wide mr-3">
                            {due.type}
                          </span>
                          <span>Due: {new Date(due.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div>
                          {due.isPaid ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePay(due.id)}
                              disabled={isPaying}
                              className="inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
                            >
                              Pay Due
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {data.dues.length === 0 && (
              <li className="px-6 py-8 text-center text-muted-foreground">No dues found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}