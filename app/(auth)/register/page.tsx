'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const COMMUNITIES = [
  'Ukeghe Uwani',
  'Ukeghe Uwenu',
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
  const [baptismCardFile, setBaptismCardFile] = useState<File | null>(null);

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

    try {
      // 1. Upload files first
      let profilePictureUrl = '';
      let birthCertUrl = '';
      let baptismCardUrl = '';

      profilePictureUrl = await uploadFile(profilePicFile);
      birthCertUrl = await uploadFile(birthCertFile);

      if (baptismCardFile) {
        baptismCardUrl = await uploadFile(baptismCardFile);
      }

      // 2. Submit registration
      const registerPayload = {
        ...formData,
        code,
        profilePicture: profilePictureUrl,
        birthCert: birthCertUrl,
        baptismCard: baptismCardUrl || undefined,
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
    <div className="bg-card/85 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-border/80 max-w-xl mx-auto my-6 relative overflow-hidden ring-1 ring-border/20">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
      <div className="text-center mb-8">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="OBEAG Logo" width={64} height={64} className="h-16 w-16" />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-gradient">Member Registration</h2>
        <p className="text-muted-foreground mt-2 text-sm">Restricted to verified group members only</p>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 text-sm p-4 rounded-lg mb-6 font-semibold">
          {error}
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleVerifyCode} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-medium text-muted-foreground">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER 6-DIGIT CODE"
              className="block w-full px-4 py-3 text-center font-mono text-xl tracking-widest border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
            />
            <p className="text-xs text-muted-foreground text-center">
              Please enter the 6-character code provided by the administrator.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient transition disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <div className="text-sm text-center">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <label className="block text-xs font-semibold text-primary uppercase tracking-wide">
              Full Name (Locked)
            </label>
            <p className="text-lg font-bold text-foreground">{memberName}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleTextChange}
                className="block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-primary focus:border-primary text-sm"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                placeholder="e.g. +234..."
                value={formData.phone}
                onChange={handleTextChange}
                className="block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-muted-foreground mb-1">
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
                className="block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-primary focus:border-primary text-sm"
              />
              <span className="text-[10px] text-muted-foreground">
                Must be born between Jan 1, 1998 and Dec 31, 2002.
              </span>
            </div>

            <div>
              <label htmlFor="community" className="block text-sm font-medium text-muted-foreground mb-1">
                Okwojo Ngwo Community
              </label>
              <select
                id="community"
                name="community"
                value={formData.community}
                onChange={handleTextChange}
                className="block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-primary focus:border-primary text-sm"
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
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleTextChange}
              className="block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground">Upload Verification Documents</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Profile Picture *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setProfilePicFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Birth Certificate *
                </label>
                <input
                  type="file"
                  required
                  accept="image/*,application/pdf"
                  onChange={(e) => setBirthCertFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Baptismal Card (Optional alternative)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setBaptismCardFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2 px-4 border border-border text-sm font-semibold rounded-lg text-foreground hover:bg-muted transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
