'use client';

import { useState, useEffect } from 'react';

interface Defaulter {
  id: string;
  name: string;
  email: string;
  amountOwed: number;
  overdueCount: number;
}

export default function RemindersPage() {
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      const res = await fetch('/api/admin/reminders');
      if (res.ok) {
        const data = await res.json();
        setDefaulters(data);
      }
    } catch (error) {
      console.error('Failed to fetch defaulters', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (userId?: string) => {
    if (userId) setSendingId(userId);
    else setSendingAll(true);
    
    setMessage('');

    try {
      const res = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage(userId ? `Reminder sent to user.` : `Sent ${data.count} reminders.`);
      } else {
        setMessage('Error: ' + data.error);
      }
    } catch (err) {
      setMessage('Failed to send request.');
    } finally {
      setSendingId(null);
      setSendingAll(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading defaulters...</div>;

  return (
    <div className="max-w-4xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Overdue Reminders</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Send payment notification reminders to members with overdue dues.</p>
        </div>
        {defaulters.length > 0 && (
          <button
            onClick={() => sendReminder()}
            disabled={sendingAll || sendingId !== null}
            className="bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm px-4 py-2 rounded-lg disabled:opacity-50 transition font-semibold cursor-pointer shadow-sm"
          >
            {sendingAll ? 'Sending All...' : 'Send Reminders to All'}
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm border ${message.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'}`}>
          {message}
        </div>
      )}
      
      <div className="bg-card shadow-sm rounded-xl border border-border overflow-hidden">
        {defaulters.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-sm text-muted-foreground">
            No overdue payments found. Everyone is paid up!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue Items</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount Owed</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {defaulters.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.name}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-foreground">{user.overdueCount}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">₦{user.amountOwed.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => sendReminder(user.id)}
                        disabled={sendingAll || sendingId !== null}
                        className="text-primary hover:underline font-semibold text-xs disabled:opacity-50 cursor-pointer"
                      >
                        {sendingId === user.id ? 'Sending...' : 'Send Reminder'}
                      </button>
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