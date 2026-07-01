'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface FinancialDuePaid {
  paymentId: string;
  dueId: string;
  title: string;
  amount: number;
  paidAt: string | null;
}

interface FinancialDueOwing {
  dueId: string;
  title: string;
  amount: number;
  dueDate: string;
  type: string;
  isPending: boolean;
}

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
  financials: {
    totalContributed: number;
    totalOwing: number;
    contributedList: FinancialDuePaid[];
    owingList: FinancialDueOwing[];
  };
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
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  
  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

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

      if (usersRes.ok) {
        const fetchedUsers = await usersRes.json();
        setUsers(fetchedUsers);
        
        // If a user details modal is open, refresh their state too
        if (selectedUser) {
          const updatedUser = fetchedUsers.find((u: User) => u.id === selectedUser.id);
          if (updatedUser) {
            setSelectedUser(updatedUser);
          }
        }
      }
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

  const handleMarkPaid = async (userId: string, dueId: string) => {
    if (!confirm('Are you sure you want to mark this due as paid for this user? This will record a manual completed payment.')) return;
    
    setIsMarkingPaid(dueId);
    try {
      const res = await fetch('/api/admin/payments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, dueId }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData(); // This will also update the modal content via selectedUser update in fetchData
      } else {
        alert(data.error || 'Failed to mark due as paid');
      }
    } catch (error) {
      console.error('Error marking due as paid:', error);
      alert('An error occurred.');
    } finally {
      setIsMarkingPaid(null);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');
  const rejectedUsers = users.filter(u => u.status === 'REJECTED');

  const filteredCodes = codes.filter((c) => {
    const searchLower = codeSearchQuery.toLowerCase();
    const matchesAssignedName = c.name.toLowerCase().includes(searchLower);
    const matchesUsedByName = c.usedByUser?.name.toLowerCase().includes(searchLower) || false;
    const matchesCode = c.code.toLowerCase().includes(searchLower);
    return matchesAssignedName || matchesUsedByName || matchesCode;
  });

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
            className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition whitespace-nowrap disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? 'Generating...' : 'Generate 6-Digit Code'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer relative ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'codes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Registration Codes
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'approved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Approved Members ({approvedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'rejected' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
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
            <div className="space-y-4 p-6">
              <div className="max-w-md relative">
                <input
                  type="text"
                  placeholder="Search code, assigned name, or user..."
                  value={codeSearchQuery}
                  onChange={(e) => setCodeSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border border-input bg-background text-foreground rounded-lg focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                />
                <span className="absolute left-3 top-3 text-muted-foreground text-sm">🔍</span>
                {codeSearchQuery && (
                  <button
                    onClick={() => setCodeSearchQuery('')}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-border/60 rounded-lg">
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
                    {filteredCodes.map((c) => (
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
                    {filteredCodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No matching codes found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                            onClick={() => setSelectedUser(u)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleUserAction(u.id, 'APPROVE')}
                            disabled={actioningId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUserAction(u.id, 'REJECT')}
                            disabled={actioningId !== null}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
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
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
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
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          View Ledger & Info
                        </button>
                      </td>
                    </tr>
                  ))}
                  {approvedUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No approved members found.</td>
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
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
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
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleUserAction(u.id, 'APPROVE')}
                            disabled={actioningId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                          >
                            Approve Now
                          </button>
                        </div>
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-muted/40">
              <h2 className="text-xl font-bold text-foreground">Member Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-foreground text-xl font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6 space-y-6 flex-1">
              
              {/* Profile Header Block */}
              <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-border">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-muted shrink-0 mx-auto md:mx-0">
                  {selectedUser.profilePicture ? (
                    <Image
                      src={selectedUser.profilePicture}
                      alt={selectedUser.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-3xl text-muted-foreground bg-muted">
                      {selectedUser.name[0]}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 text-center md:text-left flex-1 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{selectedUser.name}</h3>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedUser.status === 'APPROVED'
                          ? 'bg-green-500/10 text-green-500'
                          : selectedUser.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {selectedUser.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-sm text-muted-foreground">
                    <div>
                      <span className="block font-semibold text-foreground text-xs">PHONE</span>
                      {selectedUser.phone}
                    </div>
                    <div>
                      <span className="block font-semibold text-foreground text-xs">COMMUNITY</span>
                      {selectedUser.community}
                    </div>
                    <div>
                      <span className="block font-semibold text-foreground text-xs">DATE OF BIRTH</span>
                      {new Date(selectedUser.dob).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="block font-semibold text-foreground text-xs">JOINED DATE</span>
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Link */}
              <div className="bg-muted/30 border border-border p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Birth Certificate</h4>
                    <p className="text-xs text-muted-foreground">Official proof of age document submitted during signup.</p>
                  </div>
                </div>
                <a
                  href={selectedUser.birthCert}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Open Document
                </a>
              </div>

              {/* Financial Section */}
              {selectedUser.financials && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground">Financial Ledger</h4>
                  
                  {/* Financial Stats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
                      <span className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">TOTAL DUES CONTRIBUTED</span>
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ₦{selectedUser.financials.totalContributed.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
                      <span className="block text-xs font-semibold text-amber-600 dark:text-amber-400">TOTAL DUES OWING</span>
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        ₦{selectedUser.financials.totalOwing.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Financial Details Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    
                    {/* Dues Contributed (Paid List) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <h5 className="font-bold text-sm text-foreground">Dues Paid</h5>
                        <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {selectedUser.financials.contributedList.length} Items
                        </span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedUser.financials.contributedList.map((item) => (
                          <div key={item.paymentId} className="bg-muted/20 border border-border p-3 rounded-lg flex justify-between items-center text-sm">
                            <div>
                              <div className="font-semibold text-foreground">{item.title}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Paid on: {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <div className="font-bold text-emerald-600 dark:text-emerald-400">
                              ₦{item.amount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                        {selectedUser.financials.contributedList.length === 0 && (
                          <div className="text-center py-6 text-xs text-muted-foreground">No dues paid yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Dues Owing (Unpaid List) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <h5 className="font-bold text-sm text-foreground">Dues Outstanding</h5>
                        <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {selectedUser.financials.owingList.length} Items
                        </span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedUser.financials.owingList.map((item) => (
                          <div key={item.dueId} className="bg-muted/20 border border-border p-3 rounded-lg flex justify-between items-center text-sm gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground truncate">{item.title}</div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="uppercase">{item.type}</span>
                                {item.isPending && (
                                  <>
                                    <span>•</span>
                                    <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded font-bold uppercase animate-pulse">
                                      Pending Approval
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                              <div className="font-bold text-amber-600 dark:text-amber-400">
                                ₦{item.amount.toLocaleString()}
                              </div>
                              <button
                                onClick={() => handleMarkPaid(selectedUser.id, item.dueId)}
                                disabled={isMarkingPaid !== null}
                                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold px-2 py-1 rounded transition whitespace-nowrap cursor-pointer"
                              >
                                {isMarkingPaid === item.dueId ? '...' : 'Mark Paid'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {selectedUser.financials.owingList.length === 0 && (
                          <div className="text-center py-6 text-xs text-muted-foreground">All dues settled. No outstanding items!</div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
              
              {/* If user is PENDING approval, show approve/reject buttons in the modal too! */}
              {selectedUser.status === 'PENDING_APPROVAL' && (
                <>
                  <button
                    onClick={() => {
                      handleUserAction(selectedUser.id, 'APPROVE');
                      setSelectedUser(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Approve Member
                  </button>
                  <button
                    onClick={() => {
                      handleUserAction(selectedUser.id, 'REJECT');
                      setSelectedUser(null);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Reject Member
                  </button>
                </>
              )}
              
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-secondary text-foreground hover:bg-muted border border-border px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}