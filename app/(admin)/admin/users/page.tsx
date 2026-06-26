'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  dob: string;
  phone: string;
  community: string;
  profilePicture: string;
  birthCert: string;
  createdAt: string;
}

interface VerificationCode {
  id: string;
  code: string;
  name: string;
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
  const [activeTab, setActiveTab] = useState<'codes' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);

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
    if (!newCodeName.trim()) {
      alert('Member name is required to generate a code.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCodeName }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewCodeName('');
        fetchData(); // Refresh list
      } else {
        alert(data.error || 'Failed to generate code');
      }
    } catch (error) {
      console.error('Failed to generate code', error);
      alert('An error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'APPROVE' | 'REJECT') => {
    if (!confirm(`Are you sure you want to ${action.toLowerCase()} this user?`)) return;

    setActioningId(userId);
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });

      const data = await res.json();
      if (res.ok) {
        fetchData(); // Refresh list
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error handling user action', error);
      alert('An error occurred.');
    } finally {
      setActioningId(null);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');
  const rejectedUsers = users.filter(u => u.status === 'REJECTED');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header and Quick Generate Code */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-primary">User Management</h1>
          <p className="text-muted-foreground">Manage registration codes and approve pending member signups.</p>
        </div>

        <form onSubmit={generateCode} className="flex gap-3 bg-card p-4 rounded-xl shadow border border-border w-full md:w-auto">
          <input
            type="text"
            required
            placeholder="Pre-registered Member Name"
            value={newCodeName}
            onChange={(e) => setNewCodeName(e.target.value)}
            className="rounded-lg border border-input bg-background text-foreground text-sm px-4 py-2 focus:ring-1 focus:ring-primary w-full md:w-64 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition whitespace-nowrap disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate 6-Digit Code'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all relative ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'codes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Registration Codes
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'approved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Approved Members ({approvedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'rejected' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Rejected ({rejectedUsers.length})
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Loading records...</div>
      ) : (
        <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
          
          {/* 1. CODES TAB */}
          {activeTab === 'codes' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Member Name</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Used By</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created At</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {codes.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-primary tracking-widest">{c.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{c.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.isUsed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                          {c.isUsed ? 'Used' : 'Unused'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {c.usedByUser ? (
                          <div>
                            <div className="font-semibold text-foreground">{c.usedByUser.name}</div>
                            <div className="text-xs">{c.usedByUser.email}</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {codes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No registration codes generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. PENDING TAB */}
          {activeTab === 'pending' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name & Email</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone & Community</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">DOB</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Docs</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border bg-muted">
                          {u.profilePicture ? (
                            <Image src={u.profilePicture} alt={u.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{u.name[0]}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{u.phone}</div>
                        <div className="text-xs text-muted-foreground">{u.community}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(u.dob).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs space-y-1">
                        <a
                          href={u.birthCert}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-primary hover:underline font-semibold"
                        >
                          📄 Birth Certificate
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleUserAction(u.id, 'APPROVE')}
                            disabled={actioningId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserAction(u.id, 'REJECT')}
                            disabled={actioningId !== null}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No members pending verification.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. APPROVED TAB */}
          {activeTab === 'approved' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name & Email</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {approvedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border bg-muted">
                          {u.profilePicture ? (
                            <Image src={u.profilePicture} alt={u.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">{u.name[0]}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.community}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-500' : 'bg-secondary text-foreground'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {approvedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No approved members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. REJECTED TAB */}
          {activeTab === 'rejected' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name & Email</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {rejectedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.community}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleUserAction(u.id, 'APPROVE')}
                          disabled={actioningId !== null}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                        >
                          Approve Now
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rejectedUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">No rejected members.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </div>
  );
}