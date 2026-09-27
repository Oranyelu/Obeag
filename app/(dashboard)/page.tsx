'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    walletBalance: number;
  };
}

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  community?: string;
  phone?: string;
  googleId: string | null;
  profilePicture: string;
  birthCert?: string;
  status?: string;
  pendingProfilePicture?: string | null;
  pendingBirthCert?: string | null;
  pendingMediaStatus?: string | null;
  pendingMediaSubmittedAt?: string | null;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNPAID' | 'PENDING' | 'PAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllDues, setShowAllDues] = useState(false);

  // Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    dueIds: string[];
    totalAmount: number;
  }>({
    isOpen: false,
    dueIds: [],
    totalAmount: 0,
  });

  // Member Document Update state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState<string>('');
  const [newBirthCert, setNewBirthCert] = useState<string>('');
  const [isUploadingDoc, setIsUploadingDoc] = useState<'pic' | 'cert' | null>(null);
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');

  // Lightbox preview modal state
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  // Onboarding & Tutorial
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
      title: 'Welcome to your Dashboard',
      content: 'Your member card displays your greeting, profile avatar, active community, and quick actions to update documents and configure settings.',
      highlight: 'header-section',
    },
    {
      title: 'Financial Health & KPIs',
      content: 'Track your total dues contributed, outstanding balance, wallet excess credit, and overall settlement completion percentage at a glance.',
      highlight: 'kpi-deck',
    },
    {
      title: 'Your Dues Ledger',
      content: 'Filter by Unpaid, Pending, or Paid dues. You can pay individual dues or click "Pay All Outstanding" to clear everything at once.',
      highlight: 'dues-list-section',
    },
    {
      title: 'Official Bank Details',
      content: 'Use this card to quickly copy the official Association bank account number directly into your mobile banking app.',
      highlight: 'bank-card-section',
    },
    {
      title: 'Mobile Navigation',
      content: 'Use the bottom navigation bar on mobile to navigate between Home, History, Alerts, Constitution, and Settings with one tap.',
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
        alert('Payment request submitted! Waiting for administrator verification.');
        setPaymentModal(prev => ({ ...prev, isOpen: false }));
        fetchDashboardData();
      } else {
        alert(result.error || 'Payment request failed.');
      }
    } catch (error) {
      console.error('Payment error', error);
      alert('An error occurred while submitting payment.');
    } finally {
      setIsPaying(false);
    }
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText('2277356114');
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pic' | 'cert') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setDocError('File exceeds 5MB size limit.');
      return;
    }

    setIsUploadingDoc(field);
    setDocError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await res.json();
      if (res.ok && uploadData.url) {
        if (field === 'pic') setNewProfilePic(uploadData.url);
        if (field === 'cert') setNewBirthCert(uploadData.url);
      } else {
        setDocError(uploadData.error || 'Upload failed.');
      }
    } catch (err) {
      setDocError('Upload failed.');
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const submitDocumentUpdate = async () => {
    if (!newProfilePic && !newBirthCert) {
      setDocError('Please upload at least one document to submit for review.');
      return;
    }

    setIsSubmittingDocs(true);
    setDocError('');
    setDocSuccess('');

    try {
      const res = await fetch('/api/user/update-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profilePicture: newProfilePic || undefined,
          birthCert: newBirthCert || undefined,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setDocSuccess(result.message || 'Update submitted for admin review.');
        fetchProfileData();
        setTimeout(() => {
          setIsDocModalOpen(false);
          setNewProfilePic('');
          setNewBirthCert('');
          setDocSuccess('');
        }, 1500);
      } else {
        setDocError(result.error || 'Failed to submit document updates.');
      }
    } catch (err) {
      setDocError('An error occurred submitting documents.');
    } finally {
      setIsSubmittingDocs(false);
    }
  };

  // Filtered Dues Calculation
  const filteredDues = useMemo(() => {
    if (!data?.dues) return [];

    let list = [...data.dues].sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    );

    if (activeTab === 'UNPAID') {
      list = list.filter(d => !d.isPaid && !d.isPending);
    } else if (activeTab === 'PENDING') {
      list = list.filter(d => d.isPending);
    } else if (activeTab === 'PAID') {
      list = list.filter(d => d.isPaid);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        d => d.title.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data?.dues, activeTab, searchQuery]);

  const unpaidCount = data?.dues.filter(d => !d.isPaid && !d.isPending).length || 0;
  const pendingCount = data?.dues.filter(d => d.isPending).length || 0;
  const paidCount = data?.dues.filter(d => d.isPaid).length || 0;

  const displayedDues = showAllDues ? filteredDues : filteredDues.slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse w-full">
        <div className="h-32 bg-card rounded-2xl border border-border"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 bg-card rounded-2xl border border-border"></div>
          <div className="h-28 bg-card rounded-2xl border border-border"></div>
          <div className="h-28 bg-card rounded-2xl border border-border"></div>
          <div className="h-28 bg-card rounded-2xl border border-border"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-card rounded-2xl border border-border"></div>
          <div className="lg:col-span-4 h-96 bg-card rounded-2xl border border-border"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground">Unable to load dashboard</h2>
        <p className="text-xs text-muted-foreground">Please check your internet connection and try refreshing.</p>
        <button
          onClick={() => { setIsLoading(true); fetchDashboardData(); fetchProfileData(); }}
          className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      
      {/* 1. HERO MEMBER GREETING & STATUS BANNER */}
      <div
        id="header-section"
        className={`bg-card rounded-2xl sm:rounded-3xl border border-border/80 shadow-xs p-5 sm:p-7 relative overflow-hidden transition-all duration-300 card-hover ${getHighlightClass('header-section')}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          {/* Member Profile Avatar & Greetings */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            {profile?.profilePicture ? (
              <div
                onClick={() => setPreviewImage({ src: profile.profilePicture, title: `${profile.name || 'Your'} Profile Photo` })}
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-sm bg-muted shrink-0 cursor-pointer group"
                title="Click to view full photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center font-black text-primary text-2xl shrink-0 shadow-xs">
                {(session?.user?.name || 'M')[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {getGreeting()}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Active Member
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight truncate">
                {session?.user?.name || 'Member'}
              </h1>

              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                <span>Okwojo Ngwo Community: <strong className="font-semibold text-foreground">{profile?.community || 'Member'}</strong></span>
                {session?.user?.role === 'ADMIN' && (
                  <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold text-[10px]">
                    Admin
                  </span>
                )}
              </div>

              {profile?.pendingMediaStatus === 'PENDING' && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Document Update Under Review</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
            {data.stats.amountOwed > 0 && (
              <button
                type="button"
                onClick={handlePayAll}
                disabled={isPaying}
                className="bg-primary hover:opacity-95 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Pay Outstanding (₦{data.stats.amountOwed.toLocaleString()})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setNewProfilePic('');
                setNewBirthCert('');
                setDocError('');
                setDocSuccess('');
                setIsDocModalOpen(true);
              }}
              className="bg-secondary hover:bg-muted text-foreground border border-border/80 text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Update Documents</span>
            </button>

            <Link
              href="/settings"
              className="bg-secondary hover:bg-muted text-foreground border border-border/80 text-xs font-bold p-2.5 rounded-xl transition cursor-pointer shadow-xs"
              title="Go to Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            {session?.user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="bg-primary hover:opacity-90 text-primary-foreground text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition"
              >
                Admin Portal ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE FINANCIAL KPI DECK */}
      <div
        id="kpi-deck"
        className={`grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 transition-all duration-300 ${getHighlightClass('kpi-deck')}`}
      >
        {/* KPI 1: Outstanding Balance */}
        <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Outstanding
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight block">
              ₦{data.stats.amountOwed.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              {data.stats.amountOwed > 0 ? `${unpaidCount} unpaid dues pending` : 'All dues settled'}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Contributed */}
        <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Contributed
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-primary tracking-tight block">
              ₦{data.stats.totalPaidAmount.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Verified by age grade treasury
            </span>
          </div>
        </div>

        {/* KPI 3: Wallet Credit Balance */}
        <div className="bg-card rounded-2xl border border-border/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between card-hover">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Wallet Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight block">
              ₦{(data.stats.walletBalance || 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              Auto-credited to future dues
            </span>
          </div>
        </div>

        {/* KPI 4: Settlement Health Rate */}
        <div className="bg-card rounded-2xl border border-border/80 p-3 sm:p-4 shadow-xs flex items-center justify-center card-hover">
          <CircularProgressBar
            percentage={data.stats.percentagePaid}
            amountOwed={data.stats.amountOwed}
            compact={true}
          />
        </div>
      </div>

      {/* 3. SPLIT ACTIVITY & OPERATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* MAIN COLUMN (8 cols): DUES LEDGER */}
        <div
          id="dues-list-section"
          className={`lg:col-span-8 bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden transition-all duration-300 ${getHighlightClass('dues-list-section')}`}
        >
          {/* Header & Filter Tabs */}
          <div className="p-5 sm:p-6 border-b border-border/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Your Dues Ledger</h2>
                <p className="text-xs text-muted-foreground">Detailed history of all monthly and occasional age grade dues.</p>
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-48">
                <input
                  type="text"
                  placeholder="Search dues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-muted/40 border border-input rounded-xl px-3 py-2 pl-8 pr-7 text-foreground focus:ring-2 focus:ring-primary/20"
                />
                <svg className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                All Dues ({data.dues.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('UNPAID')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'UNPAID'
                    ? 'bg-foreground text-background shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Unpaid</span>
                {unpaidCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'UNPAID' ? 'bg-background text-foreground' : 'bg-muted text-foreground'
                  }`}>
                    {unpaidCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PENDING')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Pending</span>
                {pendingCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'PENDING' ? 'bg-white text-amber-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PAID')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'PAID'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>Paid</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'PAID' ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  {paidCount}
                </span>
              </button>
            </div>
          </div>

          {/* Dues List Items */}
          <div className="divide-y divide-border/60">
            {displayedDues.map((due) => (
              <div
                key={due.id}
                className="p-4 sm:p-5 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground uppercase tracking-wider text-[10px]">
                      {due.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Due: {new Date(due.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base truncate">
                    {due.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="text-left sm:text-right">
                    <span className="text-base sm:text-lg font-black text-foreground block">
                      ₦{due.amount.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    {due.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Paid</span>
                      </span>
                    ) : due.isPending ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>Pending</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePay(due.id)}
                        disabled={isPaying}
                        className="bg-primary hover:opacity-95 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        Pay Due
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredDues.length === 0 && (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-foreground">No dues matching this filter</h4>
                <p className="text-xs text-muted-foreground">Try selecting a different tab or clearing your search.</p>
              </div>
            )}
          </div>

          {/* Show More / Show Less Footer */}
          {filteredDues.length > 6 && (
            <div className="p-4 bg-muted/20 border-t border-border/60 text-center">
              <button
                type="button"
                onClick={() => setShowAllDues(!showAllDues)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {showAllDues ? 'Show Less ↑' : `View All ${filteredDues.length} Dues ↓`}
              </button>
            </div>
          )}
        </div>

        {/* SIDE COLUMN (4 cols): COMMUNITY & TREASURY HUB */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CARD 1: OFFICIAL BANK TRANSFER WIDGET */}
          <div
            id="bank-card-section"
            className={`bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 relative overflow-hidden transition-all duration-300 card-hover ${getHighlightClass('bank-card-section')}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Age Grade Bank Details</h3>
                  <span className="text-[10px] text-muted-foreground">Official Treasury Account</span>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                UBA
              </span>
            </div>

            <div className="bg-muted/30 border border-border/70 rounded-xl p-3.5 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans uppercase">Bank Name</span>
                <strong className="text-foreground font-sans">United Bank of Africa (UBA)</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans uppercase">Account Name</span>
                <strong className="text-foreground font-sans">OhaBuEnyi Age grade</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans uppercase">Account Number</span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-lg font-black text-primary font-mono tracking-widest">
                    2277356114
                  </span>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="text-[11px] font-sans font-bold px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                  >
                    {copiedBank ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Transfer your due amounts directly to this account via USSD or mobile banking, then tap <strong>Pay Due</strong> to notify the treasury.
            </p>
          </div>

          {/* CARD 2: UPCOMING MEETINGS */}
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 card-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-sm text-foreground">Upcoming Meetings</h3>
              </div>
            </div>

            <div className="space-y-3">
              {data.upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5">
                  <h4 className="font-bold text-xs text-foreground">{meeting.title}</h4>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(meeting.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{meeting.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {data.upcomingMeetings.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming meetings scheduled.</p>
              )}
            </div>
          </div>

          {/* CARD 3: RECENT BROADCASTS */}
          <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 card-hover">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <h3 className="font-bold text-sm text-foreground">Recent Broadcasts</h3>
              </div>
              <Link href="/notifications" className="text-xs font-bold text-primary hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {data.recentNotifications.slice(0, 3).map((notif) => (
                <div key={notif.id} className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-foreground truncate">{notif.title}</h4>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
              ))}

              {data.recentNotifications.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No broadcasts yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL 1: PAYMENT CONFIRMATION MODAL */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isPaying && setPaymentModal(prev => ({ ...prev, isOpen: false }))}
          ></div>

          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-md w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 max-h-[85vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

            <h3 className="text-xl font-black text-foreground mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Settle Dues Transfer</span>
            </h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              Please send the total amount to the age grade bank account, then tap <strong>I Have Sent The Money</strong> to notify the administrator.
            </p>

            <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2.5 text-xs font-mono my-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-sans">Bank:</span>
                <span className="font-bold text-foreground font-sans">United Bank of Africa (UBA)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-sans">Account Name:</span>
                <span className="font-bold text-foreground font-sans text-right">OhaBuEnyi Age grade</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px] uppercase font-sans">Account No:</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-primary text-base">2277356114</span>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="px-2 py-0.5 text-[10px] font-sans font-bold rounded bg-primary text-primary-foreground"
                  >
                    {copiedBank ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-border pt-2.5">
                <span className="text-muted-foreground text-xs uppercase font-sans font-bold">Total to Pay:</span>
                <span className="font-black text-foreground text-lg text-primary font-sans">
                  ₦{paymentModal.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={isPaying}
                onClick={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 px-4 border border-border text-xs font-bold rounded-xl text-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPaying}
                onClick={submitPayment}
                className="flex-1 py-2.5 px-4 text-xs font-bold rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isPaying ? 'Submitting...' : 'I Have Sent The Money'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DOCUMENT UPDATE MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => !isSubmittingDocs && setIsDocModalOpen(false)}
          ></div>

          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-xl w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 max-h-[85vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Update Member Documents</span>
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Upload a new profile picture and/or birth certificate. These updates require administrative review before replacing your active documents in storage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {docError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs font-semibold">
                {docError}
              </div>
            )}
            {docSuccess && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold">
                {docSuccess}
              </div>
            )}

            <div className="space-y-4">
              {/* Profile Photo Upload */}
              <div className="p-4 border border-border/80 rounded-xl bg-muted/10 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-foreground">1. New Profile Photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleDocUpload(e, 'pic')}
                  disabled={isUploadingDoc !== null || isSubmittingDocs}
                  className="w-full text-xs text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                />
                {isUploadingDoc === 'pic' && <span className="text-xs text-primary block">Uploading photo...</span>}
                {newProfilePic && (
                  <div className="flex items-center gap-3 pt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newProfilePic} alt="Uploaded" className="w-12 h-12 rounded-full object-cover border border-primary shadow-xs" />
                    <span className="text-xs text-primary font-semibold">Ready for submission</span>
                  </div>
                )}
              </div>

              {/* Birth Cert Upload */}
              <div className="p-4 border border-border/80 rounded-xl bg-muted/10 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-foreground">2. New Birth Certificate</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => handleDocUpload(e, 'cert')}
                  disabled={isUploadingDoc !== null || isSubmittingDocs}
                  className="w-full text-xs text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                />
                {isUploadingDoc === 'cert' && <span className="text-xs text-primary block">Uploading document...</span>}
                {newBirthCert && (
                  <div className="flex items-center gap-3 pt-1">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-primary font-semibold">Ready for submission</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="px-4 py-2 border border-border text-xs font-semibold rounded-xl text-foreground hover:bg-muted transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDocumentUpdate}
                disabled={isSubmittingDocs || isUploadingDoc !== null || (!newProfilePic && !newBirthCert)}
                className="px-5 py-2 text-xs font-bold rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmittingDocs ? 'Submitting...' : 'Submit for Admin Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ONBOARDING TERMS MODAL */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>

          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-lg w-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-foreground">Welcome to OBEAG</h3>
              <p className="text-muted-foreground text-xs mt-1">OhaBuEnyi Age Grade Digital Portal</p>
            </div>

            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed mb-6">
              <p className="font-semibold text-foreground">
                Dear {session?.user?.name || 'Member'}, we are excited to have you onboard!
              </p>
              <p className="text-xs text-muted-foreground">
                This application serves as our official ledger and communication tool. Before entering,
                please acknowledge our terms regarding bank transfers and dues verification.
              </p>

              <div className="flex gap-3 justify-center py-2">
                <Link
                  href="/constitution"
                  target="_blank"
                  className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Read Constitution</span>
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>View Terms of Use</span>
                </Link>
              </div>

              <label className="flex items-start gap-3 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  I confirm that I have read and agree to the <strong>Constitution & Terms of Use</strong> of OhaBuEnyi Age Grade.
                </span>
              </label>
            </div>

            <button
              disabled={!acceptedTerms}
              onClick={() => {
                if (session?.user?.id) {
                  localStorage.setItem(`obeag_terms_accepted_${session.user.id}`, 'true');
                }
                setShowOnboarding(false);
                setShowTutorial(true);
              }}
              className="w-full py-3 text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Continue to Portal →
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: INTERACTIVE TUTORIAL OVERLAY */}
      {showTutorial && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-auto"></div>

          <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md bg-card border-2 border-primary shadow-2xl p-5 rounded-2xl pointer-events-auto z-50 animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

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

            <h4 className="text-base font-bold text-foreground mb-1">
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
                  className="px-4 py-1.5 text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 rounded-lg transition cursor-pointer"
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-card max-w-2xl w-full rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-sm text-foreground truncate">{previewImage.title}</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-black/30 max-h-[70vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewImage.src} alt="Preview" className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xl" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}