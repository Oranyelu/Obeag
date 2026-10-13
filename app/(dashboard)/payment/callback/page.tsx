'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const signature = searchParams.get('signature');
  const urlStatus = searchParams.get('status');
  const urlAmount = searchParams.get('amount');
  const urlPurpose = searchParams.get('purpose');

  const isOcubyte = reference?.startsWith('OCUBYTE_') || false;

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [gatewayName, setGatewayName] = useState<string>(isOcubyte ? 'Ocubyte' : 'Paystack');
  const [message, setMessage] = useState(
    isOcubyte
      ? 'Confirming your secure payment with Ocubyte...'
      : 'Verifying your online payment with Paystack...'
  );
  const [details, setDetails] = useState<{ amount?: number; purpose?: string } | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found in URL.');
      return;
    }

    const verifyPayment = async () => {
      try {
        let res: Response;
        let data: any;

        if (reference.startsWith('OCUBYTE_')) {
          setGatewayName('Ocubyte');
          const query = new URLSearchParams({ reference });
          if (signature) query.set('signature', signature);
          if (urlStatus) query.set('status', urlStatus);
          if (urlAmount) query.set('amount', urlAmount);
          if (urlPurpose) query.set('purpose', urlPurpose);

          res = await fetch(`/api/ocubyte/verify?${query.toString()}`);
          data = await res.json();
        } else {
          setGatewayName('Paystack');
          res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
          data = await res.json();

          // Fallback to Ocubyte in case reference format differs
          if (!res.ok && !data.success) {
            const fallbackRes = await fetch(`/api/ocubyte/verify?reference=${encodeURIComponent(reference)}`);
            const fallbackData = await fallbackRes.json();
            if (fallbackRes.ok && fallbackData.success) {
              res = fallbackRes;
              data = fallbackData;
              setGatewayName('Ocubyte');
            }
          }
        }

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Payment confirmed and processed successfully!');
          setDetails({
            amount: data.amount,
            purpose: data.purpose,
          });

          // Auto-redirect to dashboard after 4 seconds
          const timer = setTimeout(() => {
            router.push('/?payment=success');
          }, 4000);

          return () => clearTimeout(timer);
        } else {
          setStatus('error');
          setMessage(data.error || data.message || 'Payment verification could not be completed.');
        }
      } catch (err) {
        console.error('Callback verification error:', err);
        setStatus('error');
        setMessage('Network error verifying payment. If you were debited, your transaction will still be processed automatically.');
      }
    };

    verifyPayment();
  }, [reference, signature, urlStatus, urlAmount, urlPurpose, router]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border/80 shadow-xl rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>

        {status === 'verifying' && (
          <div className="py-8 space-y-5">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="absolute text-xl">💳</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Confirming Payment</h2>
              <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-xs border border-emerald-500/20">
              ✓
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                Payment Verified • Secured by {gatewayName}
              </span>
              <h2 className="text-2xl font-black text-foreground mt-2">
                {details?.purpose === 'WALLET_FUNDING' ? 'Wallet Funded!' : 'Dues Settled!'}
              </h2>
              {details?.amount && (
                <p className="text-2xl font-black text-primary">
                  ₦{details.amount.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-muted-foreground mb-4">
                Redirecting to your dashboard in a few seconds...
              </p>
              <Link
                href="/?payment=success"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition shadow-xs"
              >
                Go to Dashboard Now →
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-destructive/15 text-destructive flex items-center justify-center mx-auto text-2xl shadow-xs border border-destructive/20">
              ✕
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-foreground">Verification Notice</h2>
              <p className="text-xs text-destructive max-w-xs mx-auto leading-relaxed font-medium">
                {message}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-2">
                If your account was debited, your payment is secure. Our automated webhook will reconcile your wallet balance.
              </p>
            </div>

            <div className="pt-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold transition"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {reference && (
          <div className="mt-6 pt-4 border-t border-border/60 text-[10px] text-muted-foreground font-mono truncate">
            Ref: {reference}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
