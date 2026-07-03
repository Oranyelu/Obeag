'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  dob: string;
  community: string;
  status: string;
  googleId: string | null;
  profilePicture: string;
  birthCert?: string;
  flaggedReason?: string | null;
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linking, setLinking] = useState(false);

  // Form states for flagged user corrections
  const [newName, setNewName] = useState('');
  const [newProfilePic, setNewProfilePic] = useState('');
  const [newBirthCert, setNewBirthCert] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [submittingCorrections, setSubmittingCorrections] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        
        // Initialize form states
        setNewName(data.name || '');
        setNewProfilePic(data.profilePicture || '');
        setNewBirthCert(data.birthCert || '');

        // If approved or admin, redirect back to home
        if (data.status === 'APPROVED' || data.role === 'ADMIN') {
          router.push('/');
        }
      } else {
        setError('Failed to load profile details.');
      }
    } catch (err) {
      setError('An error occurred loading your profile.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Initialization for account linking
  useEffect(() => {
    if (!profile || profile.googleId) return;

    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1046187979607-m17nch2aipj9eb2ep80n8ep273n35pqp.apps.googleusercontent.com', // fallback/default for standard Google Identity
            callback: handleGoogleCallback,
          });
          const targetLink = document.getElementById('google-link-container');
          if (targetLink) {
            window.google.accounts.id.renderButton(
              targetLink,
              { theme: 'outline', size: 'large', text: 'continue_with' }
            );
          } else {
            console.warn('Google link button container not found in DOM');
          }
        }
      };
    };

    loadGoogleScript();
  }, [profile]);

  const handleGoogleCallback = async (response: any) => {
    setLinking(true);
    setError('');

    try {
      const res = await fetch('/api/user/link-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('Google account linked successfully!');
        fetchProfile(); // Refresh profile state
      } else {
        setError(data.error || 'Failed to link Google account.');
      }
    } catch (err) {
      setError('An error occurred linking your Google account.');
    } finally {
      setLinking(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pic' | 'cert') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 1MB limit check
    if (file.size > 1024 * 1024) {
      setFormError('File exceeds the 1MB size limit.');
      return;
    }

    setFileUploading(true);
    setFormError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        if (field === 'pic') {
          setNewProfilePic(data.url);
        } else {
          setNewBirthCert(data.url);
        }
      } else {
        setFormError(data.error || 'Failed to upload file.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setFormError('An error occurred during upload.');
    } finally {
      setFileUploading(false);
    }
  };

  const handleSubmitCorrections = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCorrections(true);
    setFormError('');

    const payload: any = {};
    if (profile?.flaggedReason === 'INCOMPLETE_NAME') {
      payload.name = newName;
    } else if (profile?.flaggedReason === 'INVALID_PROFILE_PIC') {
      payload.profilePicture = newProfilePic;
    } else if (profile?.flaggedReason === 'INVALID_BIRTH_CERT' || profile?.flaggedReason === 'DOCUMENT_MISMATCH') {
      payload.birthCert = newBirthCert;
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('Your corrections have been submitted successfully. Waiting for admin approval.');
        
        // Update NextAuth Session to reflect change back to PENDING_APPROVAL
        if (updateSession) {
          await updateSession({ status: 'PENDING_APPROVAL' });
        }
        
        fetchProfile(); // Refresh page state
      } else {
        setFormError(data.error || 'Failed to submit corrections.');
      }
    } catch (err) {
      console.error('Error submitting corrections:', err);
      setFormError('An error occurred while submitting corrections.');
    } finally {
      setSubmittingCorrections(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Checking authorization status...</div>;

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        
        {/* Warning Header */}
        {profile?.status === 'FLAGGED' ? (
          <div className="bg-red-500/10 border-b border-red-500/20 p-6 text-center space-y-3">
            <div className="flex justify-center text-red-500 animate-pulse">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-500">Registration Revision Required</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your registration request has been flagged by the administrator. Please make the required corrections below to proceed.
            </p>
          </div>
        ) : (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 text-center space-y-3">
            <div className="flex justify-center text-amber-500">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Waiting for Admin Approval</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your registration profile has been recorded. An administrator must verify and approve your account before you can access member features.
            </p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-500/10 text-red-500 text-sm font-semibold border-b border-red-500/20 text-center">
            {error}
          </div>
        )}

        {/* 1. Flagged Correction Form View */}
        {profile && profile.status === 'FLAGGED' && (
          <form onSubmit={handleSubmitCorrections} className="p-6 space-y-6">
            
            {/* Lacking information alert box */}
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl space-y-1">
              <span className="block text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Lacking / Incorrect Detail</span>
              <span className="text-sm font-semibold text-foreground">
                {profile.flaggedReason === 'DOCUMENT_MISMATCH' && 'Information mismatch on your submitted documents.'}
                {profile.flaggedReason === 'INVALID_BIRTH_CERT' && 'User did not upload correct birth certificate.'}
                {profile.flaggedReason === 'INVALID_PROFILE_PIC' && 'Profile picture not visible or inappropriate.'}
                {profile.flaggedReason === 'INCOMPLETE_NAME' && 'Incomplete name details (middle name missing or wrong order).'}
              </span>
              <span className="block text-xs text-muted-foreground pt-1">
                Please upload the correct item below to resubmit your profile to the admin.
              </span>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 text-red-500 text-xs font-semibold border border-red-500/20 rounded-lg text-center">
                {formError}
              </div>
            )}

            {/* Render form conditionally based on reason */}
            {profile.flaggedReason === 'INCOMPLETE_NAME' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Full Name (Corrected)</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your full name (e.g. First Middle Last)"
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm px-4 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">
                  Please provide your complete three names or correct their ordering as it appears on your official documents.
                </p>
              </div>
            )}

            {profile.flaggedReason === 'INVALID_PROFILE_PIC' && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground">New Profile Picture</label>
                
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                    {newProfilePic ? (
                      <Image src={newProfilePic} alt="Preview" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">?</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'pic')}
                      className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                    />
                    <p className="text-[10px] text-muted-foreground">Accepts JPEG/PNG up to 1MB.</p>
                  </div>
                </div>
              </div>
            )}

            {(profile.flaggedReason === 'INVALID_BIRTH_CERT' || profile.flaggedReason === 'DOCUMENT_MISMATCH') && (
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-foreground">Correct Birth Certificate</label>
                
                <div className="space-y-3">
                  {newBirthCert && (
                    <div className="text-xs p-3 bg-muted/40 rounded-lg flex items-center justify-between border border-border">
                      <span className="font-semibold text-foreground truncate max-w-[80%]">📄 Current Birth Certificate Link</span>
                      <a href={newBirthCert} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline shrink-0 text-[11px]">View File</a>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'cert')}
                    className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground">Upload a clear image or PDF of your birth certificate (Max 1MB).</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
              <button
                type="submit"
                disabled={fileUploading || submittingCorrections}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              >
                {submittingCorrections ? 'Submitting...' : 'Submit Corrections'}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full py-2.5 px-4 bg-secondary text-foreground text-sm font-semibold rounded-lg border border-border hover:bg-muted transition cursor-pointer"
              >
                Log Out
              </button>
            </div>

          </form>
        )}

        {/* 2. Standard Pending Screen View */}
        {profile && profile.status !== 'FLAGGED' && (
          <div className="p-6 space-y-6">
            
            {/* User details */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-muted">
                {profile.profilePicture ? (
                  <Image
                    src={profile.profilePicture}
                    alt={profile.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-muted-foreground">
                    {profile.name[0]}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1">
                <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <span className="inline-block text-xs bg-amber-500/20 text-amber-500 font-semibold px-2 py-0.5 rounded">
                  Pending Verification
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="block text-xs font-semibold text-muted-foreground mb-0.5">Phone Number</span>
                <span className="font-medium text-foreground">{profile.phone}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="block text-xs font-semibold text-muted-foreground mb-0.5">Date of Birth</span>
                <span className="font-medium text-foreground">{new Date(profile.dob).toLocaleDateString()}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="block text-xs font-semibold text-muted-foreground mb-0.5">Okwojo Ngwo Community</span>
                <span className="font-medium text-foreground">{profile.community}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <span className="block text-xs font-semibold text-muted-foreground mb-0.5">Registration Status</span>
                <span className="font-semibold text-amber-500">PENDING APPROVAL</span>
              </div>
            </div>

            {/* Google Account link block */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="text-md font-bold text-foreground">Link Google Account</h3>
              <p className="text-xs text-muted-foreground">
                Link your Google account now to log in with one click in the future, even while your registration is pending approval.
              </p>

              {profile.googleId ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-sm font-semibold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Google Account Linked Successfully!
                </div>
              ) : (
                <div className="flex flex-col items-center py-2">
                  {linking ? (
                    <span className="text-sm text-muted-foreground">Linking account...</span>
                  ) : (
                    <div id="google-link-container"></div>
                  )}
                </div>
              )}
            </div>

            {/* Logout button */}
            <div className="flex gap-4 border-t border-border pt-6">
              <button
                onClick={() => signOut()}
                className="w-full py-2 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
              >
                Log Out
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
