'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('pending') === 'true') {
      setInfoMessage('Your registration is pending admin approval. You can link your Google account once you are logged in.');
    }
    const err = searchParams.get('error');
    if (err === 'GoogleNotLinked') {
      setError('This Google account is not linked to any registered user. Please register first.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setIsLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleGoogleCallback = async (response: any) => {
    setIsLoading(true);
    setError('');
    
    const res = await signIn('credentials', {
      googleToken: response.credential,
      redirect: false,
    });

    if (res?.error) {
      if (res.error === 'NOT_REGISTERED') {
        setError('This Google account is not registered. Please register first with your verification code.');
      } else {
        setError('Google sign-in failed.');
      }
      setIsLoading(false);
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    const loadGoogleScript = () => {
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
            document.getElementById('google-signin-btn'),
            { theme: 'outline', size: 'large', text: 'signin_with', width: '100%' }
          );
        }
      };
    };

    loadGoogleScript();
  }, []);

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {infoMessage && (
        <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-sm p-4 rounded-lg font-medium text-center">
          {infoMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 text-sm p-4 rounded-lg font-medium text-center">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email-address" className="block text-sm font-semibold text-muted-foreground mb-1">
            Email Address
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full px-4 py-2.5 border border-border bg-background/50 text-foreground placeholder-muted-foreground/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-muted-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full px-4 py-2.5 border border-border bg-background/50 text-foreground placeholder-muted-foreground/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-primary-foreground btn-gradient transition disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>

      {/* Google Login Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {/* Google Sign-In Button */}
      <div className="flex justify-center w-full min-h-[44px]">
        <div id="google-signin-btn" className="w-full"></div>
      </div>

      <div className="text-sm text-center">
        <Link href="/register" className="font-medium text-primary hover:text-accent transition">
          Don't have an account? Register
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-card/85 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-border/80 relative overflow-hidden ring-1 ring-border/20 max-w-md mx-auto">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-accent"></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image src="/logo.svg" alt="OBEAG Logo" width={64} height={64} className="h-16 w-16" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gradient">
          Sign in to your account
        </h2>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading login form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
