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
    <div className='max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-8 text-gray-800'>Manage Dues</h1>

      <div className='bg-white p-6 rounded-lg shadow-md mb-8'>
        <h2 className='text-xl font-semibold mb-4 text-gray-700'>Create New Due</h2>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Title</label>
              <input
                {...register('title')}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2'
              />
              {errors.title && <p className='text-red-500 text-sm'>{errors.title.message}</p>}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Amount</label>
              <input
                type='number'
                step='0.01'
                {...register('amount', { valueAsNumber: true })}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2'
              />
              {errors.amount && <p className='text-red-500 text-sm'>{errors.amount.message}</p>}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Type</label>
              <select
                {...register('type')}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2'
              >
                <option value='MONTHLY'>Monthly</option>
                <option value='OCCASIONAL'>Occasional</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700'>Due Date</label>
              <input
                type='datetime-local'
                {...register('dueDate')}
                className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2'
              />
              {errors.dueDate && <p className='text-red-500 text-sm'>{errors.dueDate.message}</p>}
            </div>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700'>Description</label>
            <textarea
              {...register('description')}
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2'
            />
          </div>
          <button
            type='submit'
            disabled={isLoading}
            className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50'
          >
            {isLoading ? 'Creating...' : 'Create Due'}
          </button>
        </form>
      </div>

      <div className='bg-white p-6 rounded-lg shadow-md'>
        <h2 className='text-xl font-semibold mb-4 text-gray-700'>Existing Dues</h2>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Title</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Amount</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Type</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Due Date</th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {dues.map((due) => (
                <tr key={due.id}>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{due.title}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>${due.amount}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{due.type}</td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{new Date(due.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}