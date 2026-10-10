import { NextResponse } from 'next/server';
import { verifyWebhookSignature, fulfillPayment } from '@/app/lib/paystack';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    // 1. Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('Paystack webhook: Invalid HMAC signature rejected.');
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // 2. Handle successful charge event
    if (event.event === 'charge.success') {
      const transactionData = event.data;
      if (transactionData && transactionData.status === 'success') {
        await fulfillPayment(transactionData);
      }
    }

    // 3. Return 200 OK to Paystack
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Paystack webhook handling error:', error);
    // Always return 200 to acknowledge webhook receipt so Paystack does not retry endlessly
    return NextResponse.json({ received: true, error: 'Internal processing logged' });
  }
}
