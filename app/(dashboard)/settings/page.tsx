'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';

const COMMUNITIES = [
  'Ukehe Uwani',
  'Ukehe Uwenu',
  'Okpatu',
  'Umudo',
  'Umueze',
  'Obinagu',
  'Amachalla',
];

interface UserSettings {
  id: string;
  name: string;
  email: string;
  phone: string;
  community: string;
  dob: string;
  status: string;
  role: string;
  googleId: string | null;
  profilePicture: string;
  birthCert: string;
  walletBalance: number;
  pendingProfilePicture: string | null;
  pendingBirthCert: string | null;
  pendingMediaStatus: string | null;
  pendingMediaSubmittedAt: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [phone, setPhone] = useState('');
  const [community, setCommunity] = useState(COMMUNITIES[0]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Google Link State
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [googleMsg, setGoogleMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Notification prefs state (saved to localStorage)
  const [notifPrefs, setNotifPrefs] = useState({
    emailReceipts: true,
    dueReminders: true,
    meetingAlerts: true,
  });

  // Modal / preview image
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  // Document update modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState('');
  const [newBirthCert, setNewBirthCert] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState<'pic' | 'cert' | null>(null);
  const [isSubmittingDocs, setIsSubmittingDocs] = useState(false);
  const [docError, setDocError] = useState('');
  const [docSuccess, setDocSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
    const savedPrefs = localStorage.getItem('obeag_notification_prefs');
    if (savedPrefs) {
      try {
        setNotifPrefs(JSON.parse(savedPrefs));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setPhone(data.phone || '');
        if (data.community && COMMUNITIES.includes(data.community)) {
          setCommunity(data.community);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In script initialization
  useEffect(() => {
    if (!settings || settings.googleId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1046187979607-m17nch2aipj9eb2ep80n8ep273n35pqp.apps.googleusercontent.com',
          callback: handleGoogleCallback,
        });
        const container = document.getElementById('settings-google-button');
        if (container) {
          (window as any).google.accounts.id.renderButton(container, {
            theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'pill',
          });
        }
      }
    };
  }, [settings, resolvedTheme]);

  const handleGoogleCallback = async (response: any) => {
    setIsLinkingGoogle(true);
    setGoogleMsg(null);
    try {
      const res = await fetch('/api/user/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGoogleMsg({ text: 'Google account linked successfully!', type: 'success' });
        fetchSettings();
      } else {
        setGoogleMsg({ text: data.error || 'Failed to link Google account', type: 'error' });
      }
    } catch (err) {
      setGoogleMsg({ text: 'An error occurred while linking Google account', type: 'error' });
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, community }),
      });
      const data = await res.json();

      if (res.ok) {
        setProfileMsg({ text: 'Profile contact details updated successfully!', type: 'success' });
        setSettings(prev => prev ? { ...prev, phone, community } : null);
      } else {
        setProfileMsg({ text: data.error || 'Failed to update profile', type: 'error' });
      }
    } catch (err) {
      setProfileMsg({ text: 'Network error occurred while saving profile', type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: settings?.hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ text: 'Password successfully updated!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSettings(prev => prev ? { ...prev, hasPassword: true } : null);
      } else {
        setPasswordMsg({ text: data.error || 'Failed to update password', type: 'error' });
      }
    } catch (err) {
      setPasswordMsg({ text: 'An error occurred while changing password.', type: 'error' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const toggleNotifPref = (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem('obeag_notification_prefs', JSON.stringify(updated));
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

      const data = await res.json();
      if (res.ok && data.url) {
        if (field === 'pic') setNewProfilePic(data.url);
        if (field === 'cert') setNewBirthCert(data.url);
      } else {
        setDocError(data.error || 'Upload failed.');
      }
    } catch (err) {
      setDocError('Upload failed.');
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const submitDocumentUpdate = async () => {
    if (!newProfilePic && !newBirthCert) {
      setDocError('Please upload at least one new document to submit.');
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

      const data = await res.json();
      if (res.ok) {
        setDocSuccess(data.message || 'Documents submitted for review.');
        fetchSettings();
        setTimeout(() => {
          setIsDocModalOpen(false);
          setNewProfilePic('');
          setNewBirthCert('');
          setDocSuccess('');
        }, 1500);
      } else {
        setDocError(data.error || 'Failed to submit document updates.');
      }
    } catch (err) {
      setDocError('An error occurred submitting documents.');
    } finally {
      setIsSubmittingDocs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-10 bg-card rounded-xl w-1/3"></div>
        <div className="h-64 bg-card rounded-2xl border border-border"></div>
        <div className="h-48 bg-card rounded-2xl border border-border"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize your member profile, contact info, security, and portal appearance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>{settings?.status === 'APPROVED' ? 'Active Member' : settings?.status}</span>
          </span>
        </div>
      </div>

      {/* Grid of Settings Sections */}
      <div className="space-y-6 sm:space-y-8">
        
        {/* SECTION 1: Personal & Contact Information */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 sm:p-7 space-y-6 transition-all">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Personal & Contact Info</h2>
                <p className="text-xs text-muted-foreground">Keep your contact information updated for age grade broadcasts.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                profileMsg.type === 'success' 
                  ? 'bg-primary/10 text-primary border border-primary/20' 
                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Registered Name
                </label>
                <input
                  type="text"
                  disabled
                  value={settings?.name || ''}
                  className="w-full rounded-xl border border-input bg-muted/50 text-foreground text-sm px-4 py-2.5 opacity-80 cursor-not-allowed"
                />
                <span className="text-[10px] text-muted-foreground">Verified against Association master ledger</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={settings?.email || ''}
                  className="w-full rounded-xl border border-input bg-muted/50 text-foreground text-sm px-4 py-2.5 opacity-80 cursor-not-allowed"
                />
                <span className="text-[10px] text-muted-foreground">Used for portal login and payment confirmations</span>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background text-foreground text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Okwojo Ngwo Sub-Community
                </label>
                <select
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background text-foreground text-sm px-4 py-2.5 focus:ring-2 focus:ring-primary/20"
                >
                  {COMMUNITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="bg-primary hover:opacity-95 text-primary-foreground text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingProfile ? 'Saving Details...' : 'Save Contact Info'}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: Identity Documents & Verification */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">Identity Documents</h2>
                <p className="text-xs text-muted-foreground">Your official passport photograph and birth certificate.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewProfilePic('');
                setNewBirthCert('');
                setDocError('');
                setDocSuccess('');
                setIsDocModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-secondary hover:bg-muted text-foreground border border-border text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Update Documents</span>
            </button>
          </div>

          {/* Pending Review Banner */}
          {settings?.pendingMediaStatus === 'PENDING' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Document Update Under Review</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You submitted updated document(s) on {settings.pendingMediaSubmittedAt ? new Date(settings.pendingMediaSubmittedAt).toLocaleDateString() : 'recently'}. 
                  An administrator must inspect and approve them before they replace your active files in storage.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Active Profile Photo */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {settings?.profilePicture ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/40 bg-muted shrink-0 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.profilePicture} alt="Passport" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-muted-foreground">
                    ?
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">Passport / Profile Photo</h4>
                  <span className="text-[10px] text-primary font-semibold block">Active in Storage</span>
                </div>
              </div>

              {settings?.profilePicture && (
                <button
                  type="button"
                  onClick={() => setPreviewImage({ src: settings.profilePicture, title: `${settings.name} - Profile Photo` })}
                  className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View</span>
                </button>
              )}
            </div>

            {/* Active Birth Certificate */}
            <div className="bg-muted/30 border border-border/60 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">Birth Certificate</h4>
                  <span className="text-[10px] text-primary font-semibold block">Active in Storage</span>
                </div>
              </div>

              {settings?.birthCert && (
                <div className="flex gap-1.5 shrink-0">
                  {!settings.birthCert.includes('placeholder') && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage({ src: settings.birthCert, title: `${settings.name} - Birth Certificate` })}
                      className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Preview</span>
                    </button>
                  )}
                  <a
                    href={settings.birthCert}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:opacity-90 transition"
                  >
                    Open ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: Appearance & Display Preferences */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4 5 5 0 015-5c.66 0 1.28.16 1.84.45A4.982 4.982 0 0115 10c0 .34-.04.67-.11.99A4.978 4.978 0 0119 15a4 4 0 01-4 4h-8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Theme & Visual Experience</h2>
              <p className="text-xs text-muted-foreground">Select your preferred lighting mode for the portal.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                theme === 'light' 
                  ? 'border-primary bg-primary/5 shadow-xs' 
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {theme === 'light' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20"></span>
                )}
              </div>
              <div>
                <span className="block font-bold text-sm text-foreground">Light Mode</span>
                <span className="text-[11px] text-muted-foreground">Crisp clean slate and white canvas</span>
              </div>
            </button>

            {/* Dark Mode Card */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                theme === 'dark' 
                  ? 'border-primary bg-primary/5 shadow-xs' 
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {theme === 'dark' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20"></span>
                )}
              </div>
              <div>
                <span className="block font-bold text-sm text-foreground">Dark Obsidian</span>
                <span className="text-[11px] text-muted-foreground">Deep executive slate and charcoal</span>
              </div>
            </button>

            {/* System Default */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                theme === 'system' 
                  ? 'border-primary bg-primary/5 shadow-xs' 
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {theme === 'system' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20"></span>
                )}
              </div>
              <div>
                <span className="block font-bold text-sm text-foreground">System Dynamic</span>
                <span className="text-[11px] text-muted-foreground">Matches your device OS schedule</span>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 4: Security & Passwords */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Security & Passwords</h2>
              <p className="text-xs text-muted-foreground">Manage your login credentials and connected accounts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Password Change Form */}
            <form onSubmit={handleSavePassword} className="space-y-4">
              <h3 className="text-sm font-bold text-foreground">Change Password</h3>

              {passwordMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  passwordMsg.type === 'success' 
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  {passwordMsg.text}
                </div>
              )}

              {settings?.hasPassword && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background text-foreground text-sm px-4 py-2"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background text-foreground text-sm px-4 py-2"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background text-foreground text-sm px-4 py-2"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingPassword}
                className="bg-primary hover:opacity-95 text-primary-foreground text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            {/* Google Account Linking */}
            <div className="space-y-4 md:border-l md:border-border/60 md:pl-8">
              <h3 className="text-sm font-bold text-foreground">Google Single Sign-On</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Linking your Google account allows seamless one-click login on any mobile or desktop browser without typing a password.
              </p>

              {googleMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${
                  googleMsg.type === 'success' 
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  {googleMsg.text}
                </div>
              )}

              {settings?.googleId ? (
                <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl flex items-center gap-3">
                  <svg className="w-6 h-6 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="block text-xs font-bold text-primary">Google Account Linked</span>
                    <span className="text-[11px] text-muted-foreground">You can sign in with your connected Google profile</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div id="settings-google-button"></div>
                  {isLinkingGoogle && <span className="text-xs text-muted-foreground">Connecting Google account...</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: Notification Preferences */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">Notification Preferences</h2>
              <p className="text-xs text-muted-foreground">Customize which updates you receive via email.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
              <div>
                <span className="block text-sm font-semibold text-foreground">Payment Confirmations</span>
                <span className="text-xs text-muted-foreground">Receive an email receipt once admin verifies your payment</span>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('emailReceipts')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  notifPrefs.emailReceipts ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifPrefs.emailReceipts ? 'translate-x-6' : 'translate-x-0'
                }`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
              <div>
                <span className="block text-sm font-semibold text-foreground">Monthly Due Reminders</span>
                <span className="text-xs text-muted-foreground">Get alerted when new monthly dues are generated</span>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('dueReminders')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  notifPrefs.dueReminders ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifPrefs.dueReminders ? 'translate-x-6' : 'translate-x-0'
                }`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
              <div>
                <span className="block text-sm font-semibold text-foreground">Meeting Announcements</span>
                <span className="text-xs text-muted-foreground">Receive calendar notices about upcoming General Assembly meetings</span>
              </div>
              <button
                type="button"
                onClick={() => toggleNotifPref('meetingAlerts')}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  notifPrefs.meetingAlerts ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notifPrefs.meetingAlerts ? 'translate-x-6' : 'translate-x-0'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Lightbox / Preview Modal */}
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

      {/* Document Update Modal */}
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
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
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
              {/* Profile Photo Uploader */}
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
                    <span className="text-xs text-primary font-semibold">New photo ready for submission</span>
                  </div>
                )}
              </div>

              {/* Birth Cert Uploader */}
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
                    <span className="text-xs text-primary font-semibold">New birth certificate ready for submission</span>
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
    </div>
  );
}
