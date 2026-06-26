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
  isPending: boolean;
  isFailed: boolean;
  isOverdue: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
}

interface DashboardData {
  dues: Due[];
  recentNotifications: Notification[];
  unreadNotificationCount: number;
  upcomingMeetings: Meeting[];
  stats: {
    totalDuesAmount: number;
    totalPaidAmount: number;
    amountOwed: number;
    percentagePaid: number;
  };
}

interface UserProfile {
  googleId: string | null;
  profilePicture: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    fetchProfileData();
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

  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const profileData = await res.json();
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    }
  };

  const handlePay = async (dueId: string) => {
    if (!confirm('Submit a payment confirmation request for this due? Make sure you have transferred the amount to the association bank account.')) return;
    
    setIsPaying(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueId }),
      });

      const result = await res.json();
      if (res.ok) {
        alert('Payment request submitted! Waiting for administrator to confirm.');
        fetchDashboardData();
      } else {
        alert(result.error || 'Payment request failed.');
      }
    } catch (error) {
      console.error('Payment error', error);
      alert('An error occurred.');
    } finally {
      setIsPaying(false);
    }
  };

  // Google Sign-In script initialization for linking accounts on dashboard
  useEffect(() => {
    if (!profile || profile.googleId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1046187979607-m17nch2aipj9eb2ep80n8ep273n35pqp.apps.googleusercontent.com',
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('dashboard-google-link'),
          { theme: 'outline', size: 'medium', text: 'signup_with' }
        );
      }
    };
  }, [profile]);

  const handleGoogleCallback = async (response: any) => {
    setIsLinking(true);
    setLinkError('');
    try {
      const res = await fetch('/api/user/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        alert('Google account linked successfully!');
        fetchProfileData(); // Reload profile
      } else {
        setLinkError(result.error || 'Failed to link Google account.');
      }
    } catch (err) {
      setLinkError('An error occurred linking Google account.');
    } finally {
      setIsLinking(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-primary">Welcome, {session?.user?.name || 'Member'}</h1>
          <p className="text-muted-foreground">Manage your dues payments and receive group updates.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {profile && !profile.googleId && (
            <div className="flex flex-col items-start gap-1 p-2 bg-muted/40 rounded-lg border border-border">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Link Google Login</span>
              <div id="dashboard-google-link"></div>
              {linkError && <span className="text-[10px] text-red-500">{linkError}</span>}
            </div>
          )}
          {session?.user?.role === 'ADMIN' && (
            <Link href="/admin" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg shadow hover:opacity-90 transition font-semibold text-center">
              Admin Dashboard
            </Link>
          )}
        </div>
      </div>
      
      {/* Grid of Broadcasts & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications Section */}
        {data.recentNotifications.length > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-xl border border-primary/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Recent Broadcasts
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
          </div>
        )}

        {/* Upcoming Meetings Section */}
        {data.upcomingMeetings.length > 0 && (
          <div className="bg-gradient-to-r from-accent/10 to-transparent p-6 rounded-xl border border-accent/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-accent flex items-center gap-2">
                  <span>📅</span> Upcoming Meetings
                </h2>
              </div>
              <div className="space-y-3">
                {data.upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="bg-card p-4 rounded-lg shadow-sm border border-border space-y-1">
                    <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                    <div className="flex flex-wrap justify-between text-xs text-muted-foreground">
                      <span>🕒 {new Date(meeting.date).toLocaleString()}</span>
                      <span>📍 {meeting.location || 'No location set'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
              ? ` You have outstanding dues of ${data.stats.amountOwed.toLocaleString()}. Please make a bank transfer and submit confirmation requests below.`
              : " Great job! You are fully paid up."}
          </p>
          <div className="w-full bg-secondary rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${data.stats.percentagePaid >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${data.stats.percentagePaid}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Dues List Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Your Dues</h2>
        <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {data.dues.map((due) => (
              <li key={due.id} className="hover:bg-muted/30 transition-colors">
                <div className="px-6 py-5 sm:px-8">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-lg font-semibold text-primary truncate">
                          {due.title}
                        </p>
                        <p className="ml-4 text-lg font-bold text-foreground">
                          {due.amount.toLocaleString()}
                        </p>
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
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                              Paid
                            </span>
                          ) : due.isPending ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Pending Confirmation
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePay(due.id)}
                              disabled={isPaying}
                              className="inline-flex items-center px-4 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-foreground btn-gradient focus:outline-none transition disabled:opacity-50 cursor-pointer"
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