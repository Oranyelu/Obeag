'use client';

import { useState, useEffect } from 'react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  submittedAt: string;
  paidAt: string | null;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  due: {
    title: string;
    amount: number;
    type: string;
  };
}

export default function ConfirmPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmingPaymentAction, setConfirmingPaymentAction] = useState<{ paymentId: string; action: 'CONFIRM' | 'DECLINE' } | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executePaymentAction = async (paymentId: string, action: 'CONFIRM' | 'DECLINE') => {
    setActioningId(paymentId);
    try {
      const res = await fetch('/api/admin/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        fetchPayments(); // Refresh lists
      } else {
        setTimeout(() => alert(data.error || 'Action failed'), 50);
      }
    } catch (error) {
      console.error('Error handling payment action:', error);
      setTimeout(() => alert('An error occurred.'), 50);
    } finally {
      setActioningId(null);
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const pastPayments = payments.filter(p => p.status !== 'PENDING');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-primary">Confirm Dues Payments</h1>
        <p className="text-muted-foreground">Verify and confirm bank transfer notifications submitted by members.</p>
      </div>

      {/* Pending Payments Section */}
      <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 bg-muted/40 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">Pending Confirmations</h2>
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {pendingPayments.length} Waiting
          </span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-muted rounded-lg w-full"></div>
            <div className="h-10 bg-muted rounded-lg w-full"></div>
            <div className="h-10 bg-muted rounded-lg w-full"></div>
          </div>
        ) : pendingPayments.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No pending payment requests to verify.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Item</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Claimed</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {pendingPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{p.user.name}</div>
                      <div className="text-xs text-muted-foreground">{p.user.email}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{p.user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-primary">{p.due.title}</div>
                      <span className="inline-block bg-secondary text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {p.due.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-foreground">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(p.submittedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                        {confirmingPaymentAction && confirmingPaymentAction.paymentId === p.id ? (
                          <div className="flex gap-1.5 items-center bg-orange-500/5 border border-orange-500/20 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                              Confirm {confirmingPaymentAction.action === 'CONFIRM' ? 'Approval' : 'Rejection'}?
                            </span>
                            <button
                              onClick={() => {
                                executePaymentAction(p.id, confirmingPaymentAction.action);
                                setConfirmingPaymentAction(null);
                              }}
                              disabled={actioningId !== null}
                              className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmingPaymentAction(null)}
                              className="bg-secondary text-foreground border border-border text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setConfirmingPaymentAction({ paymentId: p.id, action: 'CONFIRM' })}
                              disabled={actioningId !== null}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingPaymentAction({ paymentId: p.id, action: 'DECLINE' })}
                              disabled={actioningId !== null}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Confirmations Section */}
      <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Verification History</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-muted rounded-lg w-full"></div>
            <div className="h-10 bg-muted rounded-lg w-full"></div>
            <div className="h-10 bg-muted rounded-lg w-full"></div>
          </div>
        ) : pastPayments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No verification history.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Item</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Actioned</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {pastPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      <span className="font-medium text-foreground">{p.user.name}</span> ({p.user.email})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-foreground">{p.due.title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-foreground">
                      {p.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {p.status === 'COMPLETED' ? 'Approved' : 'Declined'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
