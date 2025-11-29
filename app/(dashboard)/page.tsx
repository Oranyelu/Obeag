'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Due {
  id: string;
  title: string;
  amount: number;
  type: string;
  dueDate: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dues, setDues] = useState<Due[]>([]);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
        {session?.user?.role === 'ADMIN' && (
          <Link href="/admin" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition">
            Go to Admin Dashboard
          </Link>
        )}
      </div>
      
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {/* Summary Cards */}
        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-blue-500 rounded-md p-3'>
                <svg className='h-6 w-6 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>Total Unpaid Dues</dt>
                  <dd>
                    <div className='text-lg font-medium text-gray-900'>$0.00</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white overflow-hidden shadow rounded-lg'>
          <div className='p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0 bg-green-500 rounded-md p-3'>
                <svg className='h-6 w-6 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>Paid This Month</dt>
                  <dd>
                    <div className='text-lg font-medium text-gray-900'>$0.00</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className='text-xl font-bold text-gray-900 mt-8 mb-4'>Upcoming Dues</h2>
      <div className='bg-white shadow overflow-hidden sm:rounded-md'>
        <ul className='divide-y divide-gray-200'>
          {dues.map((due) => (
            <li key={due.id}>
              <div className='px-4 py-4 sm:px-6'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium text-blue-600 truncate'>{due.title}</p>
                  <div className='ml-2 flex-shrink-0 flex'>
                    <p className='px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800'>
                      ${due.amount}
                    </p>
                  </div>
                </div>
                <div className='mt-2 sm:flex sm:justify-between'>
                  <div className='sm:flex'>
                    <p className='flex items-center text-sm text-gray-500'>
                      {due.type}
                    </p>
                  </div>
                  <div className='mt-2 flex items-center text-sm text-gray-500 sm:mt-0'>
                    <p>
                      Due on <time dateTime={due.dueDate}>{new Date(due.dueDate).toLocaleDateString()}</time>
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
          {dues.length === 0 && (
            <li className='px-4 py-4 sm:px-6 text-center text-gray-500'>No upcoming dues found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}