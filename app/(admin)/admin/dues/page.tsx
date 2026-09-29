'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const dueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().min(0, 'Amount must be positive'),
  type: z.enum(['MONTHLY', 'OCCASIONAL']),
  dueDate: z.string().min(1, 'Due date is required'),
});

type DueFormData = z.infer<typeof dueSchema>;

interface Due {
  id: string;
  title: string;
  amount: number;
  type: string;
  dueDate: string;
}

export default function ManageDuesPage() {
  const [dues, setDues] = useState<Due[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<DueFormData>({
    resolver: zodResolver(dueSchema),
    defaultValues: {
        type: 'MONTHLY'
    }
  });

  useEffect(() => {
    fetchDues();
  }, []);

  const fetchDues = async () => {
    const res = await fetch('/api/dues');
    if (res.ok) {
      const data = await res.json();
      setDues(data);
    }
  };

  const onSubmit = async (data: DueFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        reset();
        fetchDues();
      } else {
        alert('Failed to create due');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8'>
      <div>
        <h1 className='text-2xl sm:text-3xl font-bold text-primary'>Manage Dues</h1>
        <p className='text-xs sm:text-sm text-muted-foreground mt-1'>Create and configure association membership dues.</p>
      </div>

      <div className='bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border'>
        <h2 className='text-lg sm:text-xl font-semibold mb-4 text-foreground'>Create New Due</h2>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-muted-foreground'>Title</label>
              <input
                {...register('title')}
                placeholder='e.g., Monthly Dues - October 2026'
                className='mt-1 block w-full rounded-lg border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary border p-2.5 text-sm'
              />
              {errors.title && <p className='text-red-500 text-xs mt-1'>{errors.title.message}</p>}
            </div>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-muted-foreground'>Amount (₦)</label>
              <input
                type='number'
                step='0.01'
                placeholder='5000'
                {...register('amount', { valueAsNumber: true })}
                className='mt-1 block w-full rounded-lg border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary border p-2.5 text-sm'
              />
              {errors.amount && <p className='text-red-500 text-xs mt-1'>{errors.amount.message}</p>}
            </div>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-muted-foreground'>Type</label>
              <select
                {...register('type')}
                className='mt-1 block w-full rounded-lg border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary border p-2.5 text-sm'
              >
                <option value='MONTHLY'>Monthly</option>
                <option value='OCCASIONAL'>Occasional</option>
              </select>
            </div>
            <div>
              <label className='block text-xs sm:text-sm font-medium text-muted-foreground'>Due Date</label>
              <input
                type='datetime-local'
                {...register('dueDate')}
                className='mt-1 block w-full rounded-lg border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary border p-2.5 text-sm'
              />
              {errors.dueDate && <p className='text-red-500 text-xs mt-1'>{errors.dueDate.message}</p>}
            </div>
          </div>
          <div>
            <label className='block text-xs sm:text-sm font-medium text-muted-foreground'>Description</label>
            <textarea
              rows={3}
              placeholder='Optional notes or details about this due...'
              {...register('description')}
              className='mt-1 block w-full rounded-lg border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-1 focus:ring-primary border p-2.5 text-sm'
            />
          </div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-lg hover:opacity-90 disabled:opacity-50 transition font-semibold text-sm cursor-pointer shadow-sm'
          >
            {isLoading ? 'Creating...' : 'Create Due'}
          </button>
        </form>
      </div>

      <div className='bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border'>
        <h2 className='text-lg sm:text-xl font-semibold mb-4 text-foreground'>Existing Dues ({dues.length})</h2>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-border'>
            <thead className='bg-muted/50'>
              <tr>
                <th className='px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Title</th>
                <th className='px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Amount</th>
                <th className='px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Type</th>
                <th className='px-4 sm:px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Due Date</th>
              </tr>
            </thead>
            <tbody className='bg-card divide-y divide-border'>
              {dues.map((due) => (
                <tr key={due.id} className='hover:bg-muted/30 transition-colors'>
                  <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground'>{due.title}</td>
                  <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary'>₦{due.amount.toLocaleString()}</td>
                  <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                    <span className='inline-block px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-foreground'>
                      {due.type}
                    </span>
                  </td>
                  <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>{new Date(due.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {dues.length === 0 && (
                <tr>
                  <td colSpan={4} className='px-4 sm:px-6 py-8 text-center text-sm text-muted-foreground'>
                    No dues created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}