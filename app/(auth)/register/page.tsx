'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const COMMUNITIES = [
  'Ukehe Uwani',
  'Ukehe Uwenu',
  'Okpatu',
  'Umudo',
  'Umueze',
  'Obinagu',
  'Amachalla'
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State for Step 2
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    dob: '',
    community: COMMUNITIES[0],
  });

  // Files
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMemberName(data.name);
        setStep(2);
      } else {
        setError(data.error || 'Invalid or used code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const data = new FormData();
    data.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: data,
    });

    if (!res.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }

    const result = await res.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Strict Age Check frontend verification
    const birthDate = new Date(formData.dob);
    const minDate = new Date('1998-01-01');
    const maxDate = new Date('2002-12-31');

    if (birthDate < minDate || birthDate > maxDate) {
      setError('You must be born between January 1, 1998 and December 31, 2002.');
      setIsLoading(false);
      return;
    }

    if (!profilePicFile || !birthCertFile) {
      setError('Profile picture and Birth Certificate are required.');
      setIsLoading(false);
      return;
    }

    if (profilePicFile.size > 5 * 1024 * 1024 || birthCertFile.size > 5 * 1024 * 1024) {
      setError('Each uploaded file must be under 5MB.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Upload files first
      let profilePictureUrl = '';
      let birthCertUrl = '';

      profilePictureUrl = await uploadFile(profilePicFile);
      birthCertUrl = await uploadFile(birthCertFile);

      // 2. Submit registration
      const registerPayload = {
        ...formData,
        code,
        profilePicture: profilePictureUrl,
        birthCert: birthCertUrl,
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login?pending=true');
        }, 5000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-card p-8 rounded-xl shadow-lg border border-border text-center max-w-md mx-auto space-y-6 my-10">
        <div className="flex justify-center text-green-500">
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Registration Submitted!</h2>
        <p className="text-muted-foreground">
          Thank you, <strong className="text-foreground">{memberName}</strong>. Your profile has been sent for admin verification.
        </p>
        <p className="text-sm text-amber-500 font-semibold bg-amber-500/10 p-3 rounded-lg">
          Please wait for approval before logging in. You will be redirected shortly...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-xl border border-border max-w-xl mx-auto my-4 sm:my-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="OBEAG Logo" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16" />
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Member Registration
        </h2>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Restricted to authorized group members with a registration code
        </p>
      </div>

      {/* 2-Step Progress Indicator */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
          step === 1
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-muted/60 border-border text-muted-foreground'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            step === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
          }`}>
            {step > 1 ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : '1'}
          </span>
          <span className="truncate">1. Authorization</span>
        </div>

        <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
          step === 2
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-muted/40 border-border text-muted-foreground'
        }`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </span>
          <span className="truncate">2. Member Profile</span>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 text-xs sm:text-sm p-4 rounded-xl mb-6 font-semibold flex items-start gap-2.5">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="bg-secondary/40 border border-border rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="code" className="block text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                6-Digit Registration Code
              </label>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${
                code.length === 6 ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground bg-muted'
              }`}>
                {code.length} / 6
              </span>
            </div>

            <div className="relative">
              <input
                id="code"
                name="code"
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
                placeholder="ENTER CODE"
                autoComplete="one-time-code"
                autoFocus
                className="block w-full px-4 py-3.5 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.35em] border-2 border-border bg-background text-foreground rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all uppercase placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/50 shadow-inner"
              />
              {code.length === 6 && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Please enter the 6-character code provided by the administrator.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading || code.trim().length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base text-primary-foreground bg-primary hover:opacity-90 shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>{code.length === 6 ? 'Verify & Continue' : 'Enter 6-Digit Code'}</span>
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-3.5 text-xs text-muted-foreground flex items-start gap-3">
            <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="leading-relaxed">
              Registration is reserved for members with an executive authorization code. Don&apos;t have a code yet? Please contact an executive committee officer.
            </p>
          </div>

          <div className="text-sm text-center pt-2">
            <Link href="/login" className="font-semibold text-primary hover:underline transition inline-flex items-center gap-1.5">
              <span>Already have an account? Sign in</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
            <div>
              <label className="block text-[11px] font-bold text-primary uppercase tracking-wider">
                Full Name (Verified Member)
              </label>
              <p className="text-lg font-extrabold text-foreground mt-0.5">{memberName}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Authorized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleTextChange}
                placeholder="you@example.com"
                className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                placeholder="e.g. 08012345678"
                value={formData.phone}
                onChange={handleTextChange}
                className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dob" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Date of Birth
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                min="1998-01-01"
                max="2002-12-31"
                value={formData.dob}
                onChange={handleTextChange}
                className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Age requirement: Born Jan 1, 1998 – Dec 31, 2002.
              </span>
            </div>

            <div>
              <label htmlFor="community" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Okwojo Ngwo Community
              </label>
              <select
                id="community"
                name="community"
                value={formData.community}
                onChange={handleTextChange}
                className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
              >
                {COMMUNITIES.map((comm) => (
                  <option key={comm} value={comm}>
                    {comm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              Account Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Create a secure password"
              value={formData.password}
              onChange={handleTextChange}
              className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Upload Verification Documents</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Required for identity confirmation by administrators</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-secondary/30 p-3.5 rounded-xl border border-border">
                <label className="block text-xs font-bold text-foreground mb-1">
                  Profile Picture * (Max 5MB)
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setError('Profile picture exceeds 5MB limit.');
                      setProfilePicFile(null);
                      e.target.value = '';
                    } else {
                      setError('');
                      setProfilePicFile(file);
                    }
                  }}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                />
              </div>

              <div className="bg-secondary/30 p-3.5 rounded-xl border border-border">
                <label className="block text-xs font-bold text-foreground mb-1">
                  Birth Certificate * (Max 5MB)
                </label>
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setError('Birth certificate exceeds 5MB limit.');
                      setBirthCertFile(null);
                      e.target.value = '';
                    } else {
                      setError('');
                      setBirthCertFile(file);
                    }
                  }}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 file:cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3 px-5 border border-border text-sm font-semibold rounded-xl text-foreground hover:bg-muted transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-6 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Submitting Registration...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
