import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfillOcubytePayment, getOcubyteConfig } from '@/app/lib/ocubyte';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-ocubyte-signature') ||
      request.headers.get('x-signature');

    const { secretKey } = getOcubyteConfig();

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-ocubyte-signature header' }, { status: 401 });
    }

    // Verify signature using timingSafeEqual
    const computed = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');

    const computedBuf = Buffer.from(computed.toLowerCase(), 'hex');
    const signatureBuf = Buffer.from(signature.toLowerCase(), 'hex');

    if (
      computedBuf.length !== signatureBuf.length ||
      !crypto.timingSafeEqual(computedBuf, signatureBuf)
    ) {
      console.warn('Ocubyte webhook: Unauthorized - Signature mismatch.');
      return new Response('Invalid webhook signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event || payload.action || 'payment.success';
    const data = payload.data || payload;

    const reference = data.reference;
    const status = (data.status || '').toLowerCase();

    if (reference && (status === 'success' || status === 'completed' || event === 'payment.success')) {
      await fulfillOcubytePayment({
        reference,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        purpose: data.purpose,
        userId: data.userId || data.user_id,
        dueIds: data.dueIds || data.due_ids,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Ocubyte webhook error:', error);
    // Acknowledge receipt to prevent infinite retry loops while logging the error
    return NextResponse.json({ received: true, error: 'Internal processing error' });
  }
}
