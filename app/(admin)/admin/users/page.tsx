'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface VerificationCode {
  id: string;
  code: string;
  name?: string;
  isUsed: boolean;
  createdAt: string;
  usedByUser?: {
    name: string;
    email: string;
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCodeName, setNewCodeName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, codesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/codes')
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (codesRes.ok) setCodes(await codesRes.json());
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCodeName }),
      });

      if (res.ok) {
        setNewCodeName('');
        fetchData(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to generate code', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-12">
      {/* Verification Codes Section */}
      <div>
        <h1 className="text-2xl font-bold text-primary mb-6">Verification Codes</h1>
        
        <div className="bg-card p-6 rounded-lg shadow-md mb-8 border border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Generate New Code</h2>
          <form onSubmit={generateCode} className="flex gap-4">
            <input
              type="text"
              placeholder="Name (Optional - who is this for?)"
              value={newCodeName}
              onChange={(e) => setNewCodeName(e.target.value)}
              className="flex-1 rounded-md border-input bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary border p-2"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition"
            >
              {isGenerating ? 'Generating...' : 'Generate Code'}
            </button>
          </form>
        </div>

        <div className="bg-card shadow overflow-hidden sm:rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">For</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Used By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created At</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {codes.map((code) => (
                <tr key={code.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-foreground">{code.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{code.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${code.isUsed ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}`}>
                      {code.isUsed ? 'Used' : 'Available'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {code.usedByUser ? (
                      <div>
                        <div className="font-medium text-foreground">{code.usedByUser.name}</div>
                        <div className="text-muted-foreground">{code.usedByUser.email}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(code.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registered Users Section */}
      <div>
        <h1 className="text-2xl font-bold text-primary mb-6">Registered Users</h1>
        <div className="bg-card shadow overflow-hidden sm:rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}