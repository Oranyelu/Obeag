'use client';

import React, { useState } from 'react';

export interface PayWithOcubyteButtonProps {
  amount: number;
  email: string;
  name?: string;
  userId: string;
  purpose: 'WALLET_FUNDING' | 'DUE_PAYMENT';
  dueIds?: string[];
  description?: string;
  className?: string;
  children?: React.ReactNode;
  onSuccessRedirect?: (url: string) => void;
  onError?: (error: string) => void;
}

export function PayWithOcubyteButton({
  amount,
  email,
  name,
  userId,
  purpose,
  dueIds = [],
  description,
  className = '',
  children,
  onSuccessRedirect,
  onError,
}: PayWithOcubyteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email,
          name,
          userId,
          purpose,
          dueIds,
          description,
        }),
      });

      const data = await res.json();

      if (!res.ok || (!data.checkoutUrl && !data.redirectUrl)) {
        throw new Error(data.error || 'Failed to initiate checkout session');
      }

      const redirectTarget = data.checkoutUrl || data.redirectUrl;

      if (onSuccessRedirect) {
        onSuccessRedirect(redirectTarget);
      } else {
        // Redirect member to Ocubyte Gateway checkout
        window.location.href = redirectTarget;
      }
    } catch (err: any) {
      console.error('[PayWithOcubyte Error]:', err);
      if (onError) {
        onError(err.message || 'Payment initiation failed');
      } else {
        alert(`Payment Error: ${err.message || 'Failed to connect to gateway'}`);
      }
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading || amount <= 0}
      className={
        className ||
        'flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md disabled:opacity-50 cursor-pointer text-xs'
      }
    >
      {loading ? (
        <>
          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Connecting to Ocubyte Gateway...</span>
        </>
      ) : (
        children || (
          <>
            <span>Pay ₦{amount.toLocaleString()} with Ocubyte</span>
            <span>→</span>
          </>
        )
      )}
    </button>
  );
}

export default PayWithOcubyteButton;
