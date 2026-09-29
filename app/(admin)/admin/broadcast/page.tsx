'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const broadcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
});

type BroadcastFormData = z.infer<typeof broadcastSchema>;

export default function BroadcastPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
  });

  const onSubmit = async (data: BroadcastFormData) => {
    setIsLoading(true);
    setSuccessMessage('');
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSuccessMessage('Broadcast sent successfully to all users.');
        reset();
      } else {
        alert('Failed to send broadcast');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Send Broadcast</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Send immediate notification announcements to all registered members.</p>
      </div>
      
      <div className="bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border">
        {successMessage && (
          <div className="mb-4 p-3.5 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-muted-foreground uppercase mb-1">Title</label>
            <input
              {...register('title')}
              className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="e.g., General Assembly Reminder"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-muted-foreground uppercase mb-1">Message</label>
            <textarea
              {...register('message')}
              rows={5}
              className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
              placeholder="Type your message here..."
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition duration-150 cursor-pointer shadow-sm text-sm"
          >
            {isLoading ? 'Sending...' : 'Send Broadcast'}
          </button>
        </form>
      </div>
    </div>
  );
}