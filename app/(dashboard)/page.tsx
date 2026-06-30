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
  const [showAllDues, setShowAllDues] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    dueIds: string[];
    totalAmount: number;
  }>({
    isOpen: false,
    dueIds: [],
    totalAmount: 0,
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (session?.user?.id && !isLoading) {
      const accepted = localStorage.getItem(`obeag_terms_accepted_${session.user.id}`);
      if (accepted !== 'true') {
        setShowOnboarding(true);
      } else {
        const tutCompleted = localStorage.getItem(`obeag_tutorial_completed_${session.user.id}`);
        if (tutCompleted !== 'true') {
          setShowTutorial(true);
        }
      }
    }
  }, [session, isLoading]);

  const tutorialSteps = [
    {
      title: 'Dashboard Welcome',
      content: 'This card displays your profile status and custom avatar. You can also link your Google account for faster logins, or jump into the Admin Dashboard if you are an administrator.',
      highlight: 'header-section',
    },
    {
      title: 'Dues Payment Progress',
      content: 'This circular progress indicator visually displays your overall payment status percentage and your current total outstanding balance.',
      highlight: 'dues-overview',
    },
    {
      title: 'Dues Management',
      content: 'Here you can view all outstanding and paid dues. You can pay a single due by clicking "Pay Due" or pay all outstanding dues at once by clicking the "Pay All Outstanding" button.',
      highlight: 'dues-list-section',
    },
    {
      title: 'Broadcasts & Meetings',
      content: 'Stay connected with Okwojo Ngwo! View general broadcasts, news, announcements, and upcoming meetings right in these dedicated panels.',
      highlight: 'info-grid',
    },
    {
      title: 'Mobile Bottom Tabs',
      content: 'On mobile screens, use the bottom navigation tab bar to quickly switch between Home (Dashboard), History, Alerts, and the Constitution.',
      highlight: 'bottom-nav-cue',
    },
  ];

  const getHighlightClass = (elementId: string) => {
    if (!showTutorial) return '';
    const currentStep = tutorialSteps[tutorialStep];
    if (currentStep?.highlight === elementId) {
      return 'ring-4 ring-primary ring-offset-4 dark:ring-offset-background transition-all duration-300 relative z-30 scale-[1.01] shadow-2xl';
    }
    return '';
  };

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

  const handlePay = (dueId: string) => {
    const due = data?.dues.find(d => d.id === dueId);
    if (!due) return;
    setPaymentModal({
      isOpen: true,
      dueIds: [dueId],
      totalAmount: due.amount,
    });
  };

  const handlePayAll = () => {
    if (!data) return;
    const outstandingDues = data.dues.filter(due => !due.isPaid && !due.isPending);
    if (outstandingDues.length === 0) return;
    
    const totalAmount = outstandingDues.reduce((sum, due) => sum + due.amount, 0);
    setPaymentModal({
      isOpen: true,
      dueIds: outstandingDues.map(due => due.id),
      totalAmount,
    });
  };

  const submitPayment = async () => {
    setIsPaying(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueIds: paymentModal.dueIds }),
      });

      const result = await res.json();
      if (res.ok) {
        alert('Payment request submitted! Waiting for administrator to confirm.');
        setPaymentModal(prev => ({ ...prev, isOpen: false }));
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

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-28 bg-card rounded-xl border border-border shadow-sm flex items-center p-6 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted"></div>
          <div className="space-y-3">
            <div className="h-6 w-48 bg-muted rounded"></div>
            <div className="h-4 w-72 bg-muted rounded"></div>
          </div>
        </div>

        {/* Grid of Broadcasts & Meetings Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="h-5 w-36 bg-muted rounded"></div>
            <div className="space-y-3">
              <div className="h-10 bg-muted/60 rounded"></div>
              <div className="h-10 bg-muted/60 rounded"></div>
            </div>
          </div>
          <div className="h-48 bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="h-5 w-36 bg-muted rounded"></div>
            <div className="space-y-3">
              <div className="h-10 bg-muted/60 rounded"></div>
              <div className="h-10 bg-muted/60 rounded"></div>
            </div>
          </div>
        </div>

        {/* Status Bar Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 h-56 bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center space-y-4">
            <div className="w-28 h-28 rounded-full border-8 border-muted"></div>
            <div className="h-4 w-20 bg-muted rounded"></div>
          </div>
          <div className="md:col-span-2 h-56 bg-card rounded-xl border border-border p-6 flex flex-col justify-center space-y-4">
            <div className="h-6 w-32 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-2/3 bg-muted rounded"></div>
          </div>
        </div>

        {/* Dues List Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-muted rounded"></div>
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="h-12 bg-muted/60 rounded"></div>
            <div className="h-12 bg-muted/60 rounded"></div>
            <div className="h-12 bg-muted/60 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data.</div>;

  // Sort and display dues
  const sortedDues = [...data.dues].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  const displayedDues = showAllDues ? sortedDues : sortedDues.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div 
        id="header-section" 
        className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border border-border shadow-sm transition-all duration-300 ${getHighlightClass('header-section')}`}
      >
        <div className="flex items-center gap-4">
          {profile?.profilePicture ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-sm bg-muted flex-shrink-0">
              <img src={profile.profilePicture} alt="Profile" className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xl flex-shrink-0">
              {(session?.user?.name || 'M')[0]}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-primary">Welcome, {session?.user?.name || 'Member'}</h1>
            <p className="text-muted-foreground text-sm">Manage your dues payments and receive group updates.</p>
          </div>
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
      <div 
        id="info-grid" 
        className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 ${getHighlightClass('info-grid')}`}
      >
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
      <div 
        id="dues-overview" 
        className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300 ${getHighlightClass('dues-overview')}`}
      >
        <div className="md:col-span-1">
          <CircularProgressBar 
            percentage={data.stats.percentagePaid} 
            amountOwed={data.stats.amountOwed}
          />
        </div>
        
        {/* Quick Stats / Info */}
        <div className="md:col-span-2 bg-card rounded-xl shadow-lg border border-border p-6 flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Dues Overview</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {data.stats.amountOwed > 0 
              ? `You currently have outstanding dues of ₦${data.stats.amountOwed.toLocaleString()}. Please view the list below to settle your accounts via bank transfer, then submit a payment confirmation request.`
              : "Congratulations! You do not have any outstanding dues at this time."}
          </p>
        </div>
      </div>

      {/* Dues List Section */}
      <div 
        id="dues-list-section" 
        className={`transition-all duration-300 ${getHighlightClass('dues-list-section')}`}
      >
        {(() => {
          const outstandingDues = data?.dues.filter(due => !due.isPaid && !due.isPending) || [];
          const totalOutstandingAmount = outstandingDues.reduce((sum, due) => sum + due.amount, 0);
          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Dues</h2>
              {outstandingDues.length > 0 && (
                <button
                  onClick={handlePayAll}
                  disabled={isPaying}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient focus:outline-none transition disabled:opacity-50 cursor-pointer shadow-sm self-start sm:self-auto"
                >
                  Pay All Outstanding (₦{totalOutstandingAmount.toLocaleString()})
                </button>
              )}
            </div>
          );
        })()}
        <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {displayedDues.map((due) => (
              <li key={due.id} className="hover:bg-muted/30 transition-colors">
                <div className="px-6 py-5 sm:px-8">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-lg font-semibold text-primary truncate">
                          {due.title}
                        </p>
                        <p className="ml-4 text-lg font-bold text-foreground">
                          ₦{due.amount.toLocaleString()}
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
        {data.dues.length > 5 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllDues(!showAllDues)}
              className="px-6 py-2 rounded-xl bg-card/60 backdrop-blur-md border border-border text-sm font-semibold hover:bg-card transition duration-200"
            >
              {showAllDues ? 'Show Less' : `Load More (${data.dues.length - 5} hidden)`}
            </button>
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isPaying && setPaymentModal(prev => ({ ...prev, isOpen: false }))}
          ></div>
          
          {/* Modal Card */}
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-md w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
            
            <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
              <span>🏦</span> Bank Transfer Details
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Please transfer the total due amount to the account details below, then click the **"I have sent the money"** button to submit your request for approval.
            </p>

            {/* Account Details Box */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3 font-mono text-sm my-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-sans">Bank Name:</span>
                <span className="font-semibold text-foreground">United Bank of Africa (UBA)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-sans">Account Name:</span>
                <span className="font-semibold text-foreground text-right font-sans">OhaBuEnyi Age grade</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-sans">Account Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary text-base">2277356114</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('2277356114');
                      alert('Account number copied to clipboard!');
                    }}
                    className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-sans font-bold">Total to Pay:</span>
                <span className="font-extrabold text-foreground text-lg text-primary font-sans">
                  ₦{paymentModal.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isPaying}
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2 px-4 border border-border text-sm font-semibold rounded-lg text-foreground hover:bg-muted transition disabled:opacity-50 cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying}
                onClick={submitPayment}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient focus:outline-none transition disabled:opacity-50 cursor-pointer shadow-sm text-center"
              >
                {isPaying ? 'Submitting...' : 'I have sent the money'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Onboarding Welcome / Terms Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
          
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-lg w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
            
            <div className="text-center mb-6">
              <span className="text-4xl">🎉</span>
              <h3 className="text-2xl font-extrabold text-primary mt-2">Welcome to OBEAG!</h3>
              <p className="text-muted-foreground text-xs mt-1">OhaBuEnyi Age Grade Digital Portal</p>
            </div>
            
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed mb-6">
              <p className="font-semibold text-foreground">
                Dear {session?.user?.name || 'Member'}, we are excited to have you onboard!
              </p>
              <p>
                This application serves as our official ledger and communication tool. Before entering, 
                you must read and accept our Terms of Use, specifically regarding the integrity of bank transfers 
                and payments, and our use of essential session cookies.
              </p>
              
              <div className="flex gap-3 justify-center py-2">
                <Link
                  href="/constitution"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-xl hover:bg-primary/20 transition cursor-pointer"
                >
                  📖 Read Constitution
                </Link>
                <Link
                  href="/terms"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted hover:bg-muted-foreground/10 px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  📜 View Detailed Terms
                </Link>
              </div>

              {/* Scrollable Terms Excerpt */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs max-h-32 overflow-y-auto space-y-2 text-muted-foreground">
                <p className="font-bold text-foreground">1. Payment Verification Integrity</p>
                <p>You must complete a bank transfer to the age grade UBA account before claiming payment in the app. Falsifying request submissions will lead to account suspension and fines.</p>
                <p className="font-bold text-foreground">2. Cookies Consent</p>
                <p>This portal uses first-party session cookies solely to securely authenticate and keep you signed in. No third-party trackers are utilized.</p>
              </div>

              {/* Acceptance Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  I accept the Terms and Conditions of use and consent to the storage of essential session cookies.
                </span>
              </label>
            </div>

            {/* Actions */}
            <button
              type="button"
              disabled={!acceptedTerms}
              onClick={() => {
                if (session?.user?.id) {
                  localStorage.setItem(`obeag_terms_accepted_${session.user.id}`, 'true');
                  setShowOnboarding(false);
                  // Trigger tutorial
                  const tutCompleted = localStorage.getItem(`obeag_tutorial_completed_${session.user.id}`);
                  if (tutCompleted !== 'true') {
                    setShowTutorial(true);
                  }
                }
              }}
              className="w-full py-3 px-4 text-center border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient focus:outline-none transition disabled:opacity-50 cursor-pointer"
            >
              Accept & Enter Portal
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Transparent click-blocker to prevent clicking page items during tour */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-auto"></div>

          {/* Floating Tutorial Info Card */}
          <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md bg-card border-2 border-primary shadow-2xl p-5 rounded-2xl pointer-events-auto z-50 animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </span>
              <button
                onClick={() => {
                  if (session?.user?.id) {
                    localStorage.setItem(`obeag_tutorial_completed_${session.user.id}`, 'true');
                  }
                  setShowTutorial(false);
                }}
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Skip Tour
              </button>
            </div>

            <h4 className="text-lg font-bold text-foreground mb-1">
              {tutorialSteps[tutorialStep].title}
            </h4>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              {tutorialSteps[tutorialStep].content}
            </p>

            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                {tutorialSteps.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      idx === tutorialStep ? 'bg-primary w-4' : 'bg-muted-foreground/30'
                    }`}
                  ></span>
                ))}
              </div>
              
              <div className="flex gap-2">
                {tutorialStep > 0 && (
                  <button
                    onClick={() => setTutorialStep(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    if (tutorialStep < tutorialSteps.length - 1) {
                      setTutorialStep(prev => prev + 1);
                    } else {
                      if (session?.user?.id) {
                        localStorage.setItem(`obeag_tutorial_completed_${session.user.id}`, 'true');
                      }
                      setShowTutorial(false);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-primary-foreground btn-gradient rounded-lg transition cursor-pointer"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}