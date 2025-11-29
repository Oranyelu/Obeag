'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    code: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      router.push('/login');
    } else {
      const data = await res.json();
      setError(data.error || 'Registration failed');
    }
  };

  return (
    <div>
      <div>
        <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
          Register new account
        </h2>
      </div>
      <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
        <div className='rounded-md shadow-sm -space-y-px'>
          <div>
            <label htmlFor='name' className='sr-only'>
              Full Name
            </label>
            <input
              id='name'
              name='name'
              type='text'
              required
              className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
              placeholder='Full Name'
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor='email-address' className='sr-only'>
              Email address
            </label>
            <input
              id='email-address'
              name='email'
              type='email'
              autoComplete='email'
              required
              className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
              placeholder='Email address'
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor='password' className='sr-only'>
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              autoComplete='new-password'
              required
              className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
              placeholder='Password'
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor='code' className='sr-only'>
              Registration Code
            </label>
            <input
              id='code'
              name='code'
              type='text'
              required
              className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
              placeholder='Registration Code'
              value={formData.code}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && <div className='text-red-500 text-sm text-center'>{error}</div>}

        <div>
          <button
            type='submit'
            className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          >
            Register
          </button>
        </div>

        <div className='text-sm text-center'>
          <Link href='/login' className='font-medium text-blue-600 hover:text-blue-500'>
            Already have an account? Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}