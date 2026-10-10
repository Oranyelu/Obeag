/**
 * Client-side Paystack payment launcher helper.
 */

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // in Kobo
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Dynamically loads the Paystack inline popup script if not already present.
 */
export function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.PaystackPop) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('paystack-inline-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Launches Paystack payment.
 * Uses Paystack Pop inline if public key is available and script loaded,
 * or redirects to the authorization URL.
 */
export async function launchPaystackPayment({
  authorizationUrl,
  accessCode,
  reference,
  email,
  amountInNaira,
  publicKey,
  onSuccess,
  onClose,
}: {
  authorizationUrl: string;
  accessCode?: string;
  reference: string;
  email: string;
  amountInNaira: number;
  publicKey?: string;
  onSuccess?: (ref: string) => void;
  onClose?: () => void;
}) {
  const pk = publicKey || process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  // Try inline popup if public key is available
  if (pk && pk.trim().length > 0) {
    try {
      const loaded = await loadPaystackScript();
      if (loaded && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: pk.trim(),
          email,
          amount: Math.round(amountInNaira * 100),
          ref: reference,
          onClose: () => {
            if (onClose) onClose();
          },
          callback: (response) => {
            if (onSuccess) {
              onSuccess(response.reference);
            } else {
              window.location.href = `/payment/callback?reference=${encodeURIComponent(response.reference)}`;
            }
          },
        });

        handler.openIframe();
        return;
      }
    } catch (err) {
      console.warn('Paystack inline popup failed to initialize, falling back to redirect:', err);
    }
  }

  // Fallback to Paystack hosted checkout redirect (Universal & 100% reliable)
  if (authorizationUrl) {
    window.location.href = authorizationUrl;
  } else {
    throw new Error('No authorization URL available for Paystack checkout.');
  }
}
