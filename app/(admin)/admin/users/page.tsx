'use client';

import { useState, useEffect } from 'react';
import { printUnactivatedUsersPdf, downloadUnactivatedUsersPdf } from '@/app/lib/unactivatedUsersPdf';

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
  flaggedReason?: string | null;
  flaggedAt?: string | null;
  pendingProfilePicture?: string | null;
  pendingBirthCert?: string | null;
  pendingMediaStatus?: string | null;
  pendingMediaSubmittedAt?: string | null;
  createdAt: string;
  financials: {
    walletBalance: number;
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
    id: string;
    name: string;
    email: string;
    status?: string;
    phone?: string;
    community?: string;
    dob?: string;
    profilePicture?: string;
    birthCert?: string;
    createdAt?: string;
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [codes, setCodes] = useState<VerificationCode[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCodeName, setNewCodeName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'codes' | 'pending' | 'approved' | 'rejected' | 'flagged' | 'document-updates'>('pending');
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [codeSearchQuery, setCodeSearchQuery] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Document update approval state
  const [actioningMediaId, setActioningMediaId] = useState<string | null>(null);
  const [declineMediaModal, setDeclineMediaModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    feedback: string;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    feedback: '',
  });
  
  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);

  // Flagging state
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagReason, setFlagReason] = useState('DOCUMENT_MISMATCH');
  const [isFlagging, setIsFlagging] = useState(false);

  // Confirmation states
  const [confirmingMarkPaidId, setConfirmingMarkPaidId] = useState<string | null>(null);
  const [confirmingUserAction, setConfirmingUserAction] = useState<{ userId: string; action: 'APPROVE' | 'REJECT' } | null>(null);

  // Bulk transaction modal state
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    type: 'DEPOSIT' | 'WITHDRAW';
    selectedUserId: string;
    amount: string;
  }>({
    isOpen: false,
    type: 'DEPOSIT',
    selectedUserId: '',
    amount: '',
  });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Lightbox preview modal state
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  // Edit Member Name state
  const [editNameModal, setEditNameModal] = useState<{
    isOpen: boolean;
    targetId: string;
    isCode: boolean;
    currentName: string;
    newName: string;
  }>({
    isOpen: false,
    targetId: '',
    isCode: false,
    currentName: '',
    newName: '',
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameError, setEditNameError] = useState('');
  const [editNameSuccess, setEditNameSuccess] = useState('');

  const openEditNameModal = (id: string, name: string, isCode: boolean = false) => {
    setEditNameModal({
      isOpen: true,
      targetId: id,
      isCode,
      currentName: name,
      newName: name,
    });
    setEditNameError('');
    setEditNameSuccess('');
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameModal.newName.trim()) {
      setEditNameError('Member name cannot be empty.');
      return;
    }

    if (editNameModal.newName.trim() === editNameModal.currentName.trim()) {
      setEditNameModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    setIsEditingName(true);
    setEditNameError('');
    setEditNameSuccess('');

    try {
      const payload: { userId?: string; codeId?: string; newName: string } = {
        newName: editNameModal.newName.trim(),
      };

      if (editNameModal.isCode || editNameModal.targetId.startsWith('code-')) {
        payload.codeId = editNameModal.targetId.replace('code-', '');
      } else {
        payload.userId = editNameModal.targetId;
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setEditNameSuccess('Name updated successfully!');
        if (selectedUser) {
          setSelectedUser((prev) => (prev ? { ...prev, name: editNameModal.newName.trim() } : null));
        }
        setTimeout(() => {
          setEditNameModal({
            isOpen: false,
            targetId: '',
            isCode: false,
            currentName: '',
            newName: '',
          });
          setEditNameSuccess('');
        }, 500);
        await fetchData();
      } else {
        setEditNameError(data.error || 'Failed to update name.');
      }
    } catch (err) {
      console.error('Error updating member name:', err);
      setEditNameError('An unexpected network error occurred.');
    } finally {
      setIsEditingName(false);
    }
  };

  const hasRealProfilePic = (url?: string | null): boolean => {
    if (!url) return false;
    if (url.includes('placeholder')) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads');
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowFlagForm(false);
    setFlagReason('DOCUMENT_MISMATCH');
  };

  const handleViewCodeDetails = (code: VerificationCode) => {
    const totalOwing = dues.reduce((sum, d) => sum + d.amount, 0);
    const pseudoUser: User = {
      id: `code-${code.id}`,
      name: code.name,
      email: `Registration Code: ${code.code}`,
      role: 'USER',
      status: 'NOT_ACTIVATED',
      dob: '',
      phone: 'N/A',
      community: 'N/A',
      profilePicture: '',
      birthCert: '',
      createdAt: code.createdAt,
      financials: {
        walletBalance: 0,
        totalContributed: 0,
        totalOwing: totalOwing,
        contributedList: [],
        owingList: dues.map((d) => ({
          dueId: d.id,
          title: d.title,
          amount: d.amount,
          dueDate: d.dueDate,
          type: d.type,
          isPending: false,
        })),
      },
    };
    setSelectedUser(pseudoUser);
    setShowFlagForm(false);
    setFlagReason('DOCUMENT_MISMATCH');
  };

  const handleRegenerateCode = async (codeId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to regenerate the registration code for "${name}"? The existing code will be invalidated.`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/codes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`New code successfully generated for ${name}: ${data.code.code}`);
        fetchData(); // Refresh list
      } else {
        alert(data.error || 'Failed to regenerate code');
      }
    } catch (error) {
      console.error('Error regenerating code:', error);
      alert('An error occurred.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, codesRes, duesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/codes'),
        fetch('/api/dues')
      ]);

      let fetchedUsers: User[] = [];
      let fetchedCodes: VerificationCode[] = [];
      let fetchedDues: any[] = [];

      if (usersRes.ok) {
        fetchedUsers = await usersRes.json();
        setUsers(fetchedUsers);
      }
      if (codesRes.ok) {
        fetchedCodes = await codesRes.json();
        setCodes(fetchedCodes);
      }
      if (duesRes.ok) {
        fetchedDues = await duesRes.json();
        setDues(fetchedDues);
      }

      // If a details modal is open, refresh their state
      if (selectedUser) {
        if (selectedUser.id.startsWith('code-')) {
          const codeId = selectedUser.id.replace('code-', '');
          const updatedCode = fetchedCodes.find((c) => c.id === codeId);
          if (updatedCode) {
            // Re-create pseudo-user
            const totalOwing = fetchedDues.reduce((sum, d) => sum + d.amount, 0);
            const pseudoUser: User = {
              id: `code-${updatedCode.id}`,
              name: updatedCode.name,
              email: `Registration Code: ${updatedCode.code}`,
              role: 'USER',
              status: 'NOT_ACTIVATED',
              dob: '',
              phone: 'N/A',
              community: 'N/A',
              profilePicture: '',
              birthCert: '',
              createdAt: updatedCode.createdAt,
              financials: {
                walletBalance: 0,
                totalContributed: 0,
                totalOwing: totalOwing,
                contributedList: [],
                owingList: fetchedDues.map((d) => ({
                  dueId: d.id,
                  title: d.title,
                  amount: d.amount,
                  dueDate: d.dueDate,
                  type: d.type,
                  isPending: false,
                })),
              },
            };
            setSelectedUser(pseudoUser);
          }
        } else {
          const updatedUser = fetchedUsers.find((u) => u.id === selectedUser.id);
          if (updatedUser) {
            setSelectedUser(updatedUser);
          }
        }
      }
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

  const executeUserAction = async (userId: string, action: 'APPROVE' | 'REJECT') => {
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
        setTimeout(() => alert(data.error || 'Action failed'), 50);
      }
    } catch (error) {
      console.error('Error handling user action', error);
      setTimeout(() => alert('An error occurred.'), 50);
    } finally {
      setActioningId(null);
    }
  };

  const executeMarkPaid = async (userId: string, dueId: string) => {
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
        setTimeout(() => alert(data.error || 'Failed to mark due as paid'), 50);
      }
    } catch (error) {
      console.error('Error marking due as paid:', error);
      setTimeout(() => alert('An error occurred.'), 50);
    } finally {
      setIsMarkingPaid(null);
    }
  };

  const handleFlagUser = async (userId: string) => {
    setIsFlagging(true);
    try {
      const res = await fetch('/api/admin/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'FLAG', flaggedReason: flagReason }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowFlagForm(false);
        setFlagReason('DOCUMENT_MISMATCH');
        setSelectedUser(null); // Close details modal
        fetchData(); // Refresh list
      } else {
        alert(data.error || 'Flagging action failed');
      }
    } catch (error) {
      console.error('Error flagging user:', error);
      alert('An error occurred.');
    } finally {
      setIsFlagging(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { type, selectedUserId, amount } = bulkModal;

    if (!selectedUserId) {
      alert('Please select a member.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          amount: parsedAmount,
          action: type,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Transaction processed successfully.');
        setBulkModal({
          isOpen: false,
          type: 'DEPOSIT',
          selectedUserId: '',
          amount: '',
        });
        await fetchData(); // Refresh list to get updated wallet and dues
      } else {
        alert(data.error || 'Failed to process transaction.');
      }
    } catch (error) {
      console.error('Error submitting bulk transaction:', error);
      alert('An error occurred while processing the transaction.');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING_APPROVAL');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');
  const rejectedUsers = users.filter(u => u.status === 'REJECTED');
  const flaggedUsers = users.filter(u => u.status === 'FLAGGED');
  const mediaPendingUsers = users.filter(u => u.pendingMediaStatus === 'PENDING');

  const handleMediaAction = async (userId: string, action: 'APPROVE' | 'REJECT', feedback?: string) => {
    setActioningMediaId(userId);
    try {
      const res = await fetch('/api/admin/users/media-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, feedback }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || (action === 'APPROVE' ? 'Document update approved.' : 'Document update declined.'));
        setDeclineMediaModal({ isOpen: false, userId: '', userName: '', feedback: '' });
        fetchData();
      } else {
        alert(data.error || 'Failed to process document approval action.');
      }
    } catch (err) {
      console.error('Media action error:', err);
      alert('An error occurred while processing the request.');
    } finally {
      setActioningMediaId(null);
    }
  };

  const filteredCodes = codes.filter((c) => {
    const searchLower = codeSearchQuery.toLowerCase();
    const matchesAssignedName = c.name.toLowerCase().includes(searchLower);
    const matchesUsedByName = c.usedByUser?.name.toLowerCase().includes(searchLower) || false;
    const matchesCode = c.code.toLowerCase().includes(searchLower);
    return matchesAssignedName || matchesUsedByName || matchesCode;
  });

  const unactivatedUsers = codes.filter((c) => !c.isUsed);

  const handlePrintUnactivatedUsers = (action: 'print' | 'download' = 'print', forceAll = false) => {
    let targetUsers = unactivatedUsers;
    if (!forceAll && activeTab === 'codes' && codeSearchQuery.trim()) {
      targetUsers = filteredCodes.filter((c) => !c.isUsed);
    }

    if (targetUsers.length === 0) {
      alert(
        !forceAll && activeTab === 'codes' && codeSearchQuery.trim()
          ? 'No matching unactivated users found for your search.'
          : 'There are currently no unactivated users to print.'
      );
      return;
    }

    setIsPrinting(true);
    try {
      if (action === 'download') {
        downloadUnactivatedUsersPdf(targetUsers);
      } else {
        printUnactivatedUsersPdf(targetUsers);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('An error occurred while generating the PDF.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full min-w-0">
      
      {/* Header and Quick Generate Code */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">User Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage registration codes and approve pending member signups.</p>
        </div>

        <form onSubmit={generateCode} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 bg-card p-3 sm:p-4 rounded-xl shadow-sm border border-border w-full md:w-auto">
          <input
            type="text"
            required
            placeholder="Pre-registered Member Name"
            value={newCodeName}
            onChange={(e) => setNewCodeName(e.target.value)}
            className="rounded-lg border border-input bg-background text-foreground text-sm px-3.5 py-2 focus:ring-1 focus:ring-primary w-full md:w-64 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition whitespace-nowrap disabled:opacity-50 cursor-pointer w-full sm:w-auto text-center"
          >
            {isGenerating ? 'Generating...' : 'Generate 6-Digit Code'}
          </button>
        </form>
      </div>

      {/* Action Bar: Bulk Operations & Print Users */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-muted/20 p-3.5 sm:p-4 rounded-xl border border-border/60">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 mr-1">
            <svg className="w-4 h-4 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.98 1-1.72V9c0-.74-.41-1.37-1-1.72zM20 9v6h-7V9h7zM5 5h14v2H5V5zm0 14V9h6v8h9v2H5z" />
            </svg>
            <span>Bulk Operations:</span>
          </div>
          <button
            onClick={() => setBulkModal({ isOpen: true, type: 'DEPOSIT', selectedUserId: '', amount: '' })}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
          >
            Pay Bulk Dues
          </button>
          <button
            onClick={() => setBulkModal({ isOpen: true, type: 'WITHDRAW', selectedUserId: '', amount: '' })}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 sm:px-4 py-2 rounded-lg transition shadow-sm cursor-pointer"
          >
            Deduct Bulk
          </button>
        </div>

        {/* Print Unactivated Users Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative inline-flex rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => handlePrintUnactivatedUsers('print', true)}
              disabled={isPrinting || unactivatedUsers.length === 0}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-3 sm:px-4 py-2 rounded-l-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
              title="Print PDF with unactivated user names and registration codes"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>{isPrinting ? 'Preparing PDF...' : `Print Users (${unactivatedUsers.length})`}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintUnactivatedUsers('download', true)}
              disabled={isPrinting || unactivatedUsers.length === 0}
              className="inline-flex items-center px-2.5 py-2 bg-primary/90 text-primary-foreground text-xs font-bold rounded-r-lg border-l border-primary-foreground/20 hover:bg-primary transition disabled:opacity-50 cursor-pointer"
              title="Download PDF directly"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - horizontally scrollable without viewport blowout */}
      <div className="flex border-b border-border space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Pending Approvals ({pendingUsers.length})
          {pendingUsers.length > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('document-updates')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${activeTab === 'document-updates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Document Updates ({mediaPendingUsers.length})
          {mediaPendingUsers.length > 0 && (
            <span className="ml-1.5 bg-primary text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {mediaPendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'codes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Registration Codes
          {unactivatedUsers.length > 0 && (
            <span className="ml-1.5 bg-primary/10 text-primary text-[11px] px-1.5 py-0.5 rounded-full font-bold">
              {unactivatedUsers.length} Unactivated
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'approved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Approved Members ({approvedUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer relative whitespace-nowrap shrink-0 ${activeTab === 'flagged' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Flagged / Revisions ({flaggedUsers.length})
          {flaggedUsers.length > 0 && (
            <span className="ml-1.5 bg-amber-500 text-white text-[11px] px-1.5 py-0.5 rounded-full font-bold">
              {flaggedUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'rejected' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Rejected ({rejectedUsers.length})
        </button>
      </div>

      {isLoading ? (
        <div className="bg-card shadow-lg rounded-xl border border-border p-6 space-y-4 animate-pulse">
          <div className="h-10 bg-muted rounded-lg w-1/3"></div>
          <div className="space-y-3 pt-4">
            <div className="h-12 bg-muted rounded-lg w-full"></div>
            <div className="h-12 bg-muted rounded-lg w-full"></div>
            <div className="h-12 bg-muted rounded-lg w-full"></div>
            <div className="h-12 bg-muted rounded-lg w-full"></div>
            <div className="h-12 bg-muted rounded-lg w-full"></div>
          </div>
        </div>
      ) : (
        <div className="bg-card shadow-lg rounded-xl border border-border overflow-hidden">
          
          {/* 1. CODES TAB */}
          {activeTab === 'codes' && (
            <div className="space-y-4 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-md relative w-full">
                  <input
                    type="text"
                    placeholder="Search code, assigned name, or user..."
                    value={codeSearchQuery}
                    onChange={(e) => setCodeSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 pl-10 border border-input bg-background text-foreground rounded-lg focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                  />
                  <span className="absolute left-3 top-3 text-muted-foreground text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                  </span>
                  {codeSearchQuery && (
                    <button
                      onClick={() => setCodeSearchQuery('')}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative inline-flex rounded-lg shadow-sm">
                    <button
                      type="button"
                      onClick={() => handlePrintUnactivatedUsers('print', false)}
                      disabled={isPrinting || unactivatedUsers.length === 0}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-3.5 py-2 rounded-l-lg hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                      title="Print PDF with unactivated user names and registration codes"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>
                        {codeSearchQuery.trim()
                          ? `Print Matching (${filteredCodes.filter((c) => !c.isUsed).length})`
                          : `Print Users (${unactivatedUsers.length})`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintUnactivatedUsers('download', false)}
                      disabled={isPrinting || unactivatedUsers.length === 0}
                      className="inline-flex items-center px-2.5 py-2 bg-primary/90 text-primary-foreground text-xs font-bold rounded-r-lg border-l border-primary-foreground/20 hover:bg-primary transition disabled:opacity-50 cursor-pointer"
                      title="Download PDF directly"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
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
                      <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {filteredCodes.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-primary tracking-widest">{c.code}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{c.name}</span>
                            <button
                              type="button"
                              onClick={() => openEditNameModal(c.id, c.name, true)}
                              className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                              title="Edit pre-registered member name"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.isUsed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {c.isUsed ? 'Used' : 'Unused'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {c.usedByUser ? (
                            <div className="flex items-center gap-3">
                              {hasRealProfilePic(c.usedByUser.profilePicture) ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: c.usedByUser!.profilePicture!, title: `${c.usedByUser!.name} - Profile Photo` })}
                                  className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary shadow-sm hover:scale-105 transition-all group shrink-0 cursor-pointer"
                                  title="Click to zoom photo"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={c.usedByUser.profilePicture}
                                    alt={c.usedByUser.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                  </div>
                                </button>
                              ) : (
                                <div className="w-9 h-9 rounded-full border border-border bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs shrink-0">
                                  {c.usedByUser.name[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-foreground flex items-center gap-2">
                                  <span>{c.usedByUser.name}</span>
                                  {c.usedByUser.status && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      c.usedByUser.status === 'APPROVED' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                      c.usedByUser.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                      'bg-muted text-muted-foreground'
                                    }`}>
                                      {c.usedByUser.status.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">{c.usedByUser.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Unassigned / Pending Activation</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          {c.isUsed && c.usedByUser ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => {
                                  const fullUser = users.find(u => u.id === c.usedByUser?.id);
                                  if (fullUser) {
                                    handleViewDetails(fullUser);
                                  } else {
                                    handleViewCodeDetails(c);
                                  }
                                }}
                                className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                title="View full member profile, photo, and ledger"
                              >
                                View Member ↗
                              </button>
                            </div>
                          ) : !c.isUsed ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleViewCodeDetails(c)}
                                className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => handleRegenerateCode(c.id, c.name)}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              >
                                Regenerate Code
                              </button>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                    {filteredCodes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No matching codes found.</td>
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
                        {hasRealProfilePic(u.profilePicture) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: u.profilePicture, title: `${u.name} - Profile Photo` })}
                            className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/40 hover:border-primary shadow-sm hover:scale-105 transition-all group block cursor-pointer"
                            title="Click to inspect photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.profilePicture}
                              alt={u.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-bold text-muted-foreground">
                            {u.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{u.name}</span>
                          <button
                            type="button"
                            onClick={() => openEditNameModal(u.id, u.name, false)}
                            className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                            title="Edit member name"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{u.phone}</div>
                        <div className="text-xs text-muted-foreground">{u.community}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(u.dob).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs space-y-1.5">
                        {hasRealProfilePic(u.profilePicture) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: u.profilePicture, title: `${u.name} - Profile Photo` })}
                            className="flex items-center gap-1.5 text-primary hover:underline font-semibold cursor-pointer text-left"
                          >
                            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                            </svg>
                            <span>View Profile Photo</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                            </svg>
                            <span>No Photo Uploaded</span>
                          </span>
                        )}
                        {u.birthCert && (
                          <a
                            href={u.birthCert}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
                          >
                            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
                            </svg>
                            <span>Birth Certificate</span>
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(u)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Details
                          </button>
                          {confirmingUserAction && confirmingUserAction.userId === u.id ? (
                            <div className="flex gap-1.5 items-center bg-orange-500/5 border border-orange-500/20 px-2 py-1 rounded-lg">
                              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                                Confirm {confirmingUserAction.action === 'APPROVE' ? 'Approve' : 'Reject'}?
                              </span>
                              <button
                                onClick={() => {
                                  executeUserAction(u.id, confirmingUserAction.action);
                                  setConfirmingUserAction(null);
                                }}
                                disabled={actioningId !== null}
                                className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmingUserAction(null)}
                                className="bg-secondary text-foreground border border-border text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setConfirmingUserAction({ userId: u.id, action: 'APPROVE' })}
                                disabled={actioningId !== null}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setConfirmingUserAction({ userId: u.id, action: 'REJECT' })}
                                disabled={actioningId !== null}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="flex justify-center">
                            <svg className="w-10 h-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-foreground">No members currently pending verification</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            All registered member applications have been reviewed. You can inspect the photos, profiles, and financial ledgers of all active members in the Approved Members list.
                          </p>
                          <button
                            type="button"
                            onClick={() => setActiveTab('approved')}
                            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition cursor-pointer shadow-sm"
                          >
                            <span>View Approved Members ({approvedUsers.length})</span>
                            <span>→</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2b. DOCUMENT UPDATES TAB */}
          {activeTab === 'document-updates' && (
            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Requested Document Updates</h3>
                  <p className="text-xs text-muted-foreground">
                    Review and verify updated profile pictures and birth certificates submitted by active members.
                    Approving replaces the existing documents and removes old files from storage.
                  </p>
                </div>
                <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full shrink-0">
                  {mediaPendingUsers.length} Pending Review
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {mediaPendingUsers.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5 hover:border-primary/40 transition-colors">
                    {/* User Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        {hasRealProfilePic(u.profilePicture) ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u.profilePicture} alt={u.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-border bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm shrink-0">
                            {u.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span>{u.name}</span>
                            <button
                              type="button"
                              onClick={() => openEditNameModal(u.id, u.name, false)}
                              className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                              title="Edit member name"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 font-semibold px-2 py-0.5 rounded-full">
                              Active Member
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email} • {u.phone} • {u.community}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {u.pendingMediaSubmittedAt && (
                          <span className="text-xs text-muted-foreground">
                            Submitted: {new Date(u.pendingMediaSubmittedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Profile Picture Comparison Card */}
                      <div className="bg-muted/20 border border-border/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                            </svg>
                            <span>Profile Photo</span>
                          </h4>
                          {u.pendingProfilePicture ? (
                            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              Update Requested
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">Unchanged</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {/* Current Photo */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-muted-foreground">Current Active Photo</span>
                            {hasRealProfilePic(u.profilePicture) ? (
                              <div className="relative group">
                                <div className="w-full h-32 rounded-lg overflow-hidden border border-border bg-muted/50">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u.profilePicture} alt="Current" className="w-full h-full object-cover" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: u.profilePicture, title: `${u.name} - Current Profile Photo` })}
                                  className="mt-1.5 w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  <span>Inspect</span>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground italic">
                                No Photo
                              </div>
                            )}
                          </div>

                          {/* Proposed New Photo */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400">Proposed New Photo</span>
                            {u.pendingProfilePicture ? (
                              <div className="relative group">
                                <div className="w-full h-32 rounded-lg overflow-hidden border-2 border-blue-500 bg-muted/50 shadow-sm">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u.pendingProfilePicture} alt="Proposed" className="w-full h-full object-cover" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: u.pendingProfilePicture!, title: `${u.name} - Proposed New Profile Photo` })}
                                  className="mt-1.5 w-full flex items-center justify-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                                >
                                  <span>Inspect New</span>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground italic bg-muted/10">
                                None Submitted
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Birth Certificate Comparison Card */}
                      <div className="bg-muted/20 border border-border/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
                            </svg>
                            <span>Birth Certificate</span>
                          </h4>
                          {u.pendingBirthCert ? (
                            <span className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              Update Requested
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">Unchanged</span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {/* Current Birth Cert */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-muted-foreground">Current Document</span>
                            {u.birthCert && !u.birthCert.includes('placeholder') ? (
                              <div className="space-y-2">
                                <div 
                                  onClick={() => setPreviewImage({ src: u.birthCert, title: `${u.name} - Current Birth Certificate` })}
                                  className="w-full h-32 rounded-lg border border-border bg-muted/50 overflow-hidden cursor-pointer flex items-center justify-center p-2 group"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u.birthCert} alt="Current Birth Cert" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                                </div>
                                <div className="flex justify-between text-xs font-semibold">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ src: u.birthCert, title: `${u.name} - Current Birth Certificate` })}
                                    className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Preview</span>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                                    </svg>
                                  </button>
                                  <a href={u.birthCert} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    Open ↗
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground italic">
                                No Document
                              </div>
                            )}
                          </div>

                          {/* Proposed New Birth Cert */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400">Proposed Document</span>
                            {u.pendingBirthCert ? (
                              <div className="space-y-2">
                                <div 
                                  onClick={() => setPreviewImage({ src: u.pendingBirthCert!, title: `${u.name} - Proposed Birth Certificate` })}
                                  className="w-full h-32 rounded-lg border-2 border-blue-500 bg-muted/50 overflow-hidden cursor-pointer flex items-center justify-center p-2 group shadow-sm"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={u.pendingBirthCert} alt="Proposed Birth Cert" className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                                </div>
                                <div className="flex justify-between text-xs font-semibold">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ src: u.pendingBirthCert!, title: `${u.name} - Proposed Birth Certificate` })}
                                    className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Preview New</span>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 14z" />
                                    </svg>
                                  </button>
                                  <a href={u.pendingBirthCert} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    Open ↗
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground italic bg-muted/10">
                                None Submitted
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60 bg-muted/10 -mx-5 -mb-5 p-3.5 sm:p-4 rounded-b-xl">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(u)}
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer text-left"
                      >
                        View Full Profile & Ledger ↗
                      </button>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                          type="button"
                          disabled={actioningMediaId === u.id}
                          onClick={() => setDeclineMediaModal({
                            isOpen: true,
                            userId: u.id,
                            userName: u.name,
                            feedback: '',
                          })}
                          className="bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer text-center"
                        >
                          Decline Update
                        </button>
                        <button
                          type="button"
                          disabled={actioningMediaId === u.id}
                          onClick={() => {
                            if (window.confirm(`Approve document update for ${u.name}? This will replace the active profile picture/birth certificate and permanently delete the old files from storage.`)) {
                              handleMediaAction(u.id, 'APPROVE');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-sm text-center"
                        >
                          {actioningMediaId === u.id ? 'Processing...' : 'Approve & Replace Storage Files'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {mediaPendingUsers.length === 0 && (
                  <div className="py-16 text-center space-y-3">
                    <div className="flex justify-center text-muted-foreground">
                      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-foreground">No Document Updates Pending Review</h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      When active members request to change their profile picture or birth certificate, their submission will appear here for comparison and administrative approval before replacing files in storage.
                    </p>
                  </div>
                )}
              </div>
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
                        {hasRealProfilePic(u.profilePicture) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: u.profilePicture, title: `${u.name} - Profile Photo` })}
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-border hover:border-primary shadow-sm hover:scale-105 transition-all group block cursor-pointer"
                            title="Click to view full photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.profilePicture}
                              alt={u.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm">
                            {u.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{u.name}</span>
                          <button
                            type="button"
                            onClick={() => openEditNameModal(u.id, u.name, false)}
                            className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                            title="Edit member name"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>
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
                          onClick={() => handleViewDetails(u)}
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

          {/* 3b. FLAGGED TAB */}
          {activeTab === 'flagged' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name & Email</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lacking / Issue</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flagged At</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {flaggedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasRealProfilePic(u.profilePicture) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: u.profilePicture, title: `${u.name} - Profile Photo` })}
                            className="relative w-10 h-10 rounded-full overflow-hidden border border-border hover:border-primary shadow-sm hover:scale-105 transition-all group block cursor-pointer"
                            title="Click to view full photo"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.profilePicture}
                              alt={u.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px]">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                              </svg>
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm">
                            {u.name[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{u.name}</span>
                          <button
                            type="button"
                            onClick={() => openEditNameModal(u.id, u.name, false)}
                            className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                            title="Edit member name"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {u.flaggedReason === 'DOCUMENT_MISMATCH' && 'Document Mismatch'}
                        {u.flaggedReason === 'INVALID_BIRTH_CERT' && 'Birth Certificate Required'}
                        {u.flaggedReason === 'INVALID_PROFILE_PIC' && 'Profile Picture Required'}
                        {u.flaggedReason === 'INCOMPLETE_NAME' && 'Incomplete Name'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {u.flaggedAt ? new Date(u.flaggedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(u)}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {flaggedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">No flagged accounts currently.</td>
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{u.name}</span>
                          <button
                            type="button"
                            onClick={() => openEditNameModal(u.id, u.name, false)}
                            className="text-muted-foreground hover:text-primary transition p-1 rounded-md hover:bg-muted cursor-pointer"
                            title="Edit member name"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{u.community}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(u)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Details
                          </button>
                          {confirmingUserAction && confirmingUserAction.userId === u.id ? (
                            <div className="flex gap-1.5 items-center bg-orange-500/5 border border-orange-500/20 px-2 py-1 rounded-lg">
                              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                                Confirm Approve?
                              </span>
                              <button
                                onClick={() => {
                                  executeUserAction(u.id, 'APPROVE');
                                  setConfirmingUserAction(null);
                                }}
                                disabled={actioningId !== null}
                                className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmingUserAction(null)}
                                className="bg-secondary text-foreground border border-border text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmingUserAction({ userId: u.id, action: 'APPROVE' })}
                              disabled={actioningId !== null}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                            >
                              Approve Now
                            </button>
                          )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-card w-full max-w-4xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Member Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-3.5 sm:p-6 space-y-5 sm:space-y-6 flex-1">
              
              {/* Profile Header Block */}
              <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-border">
                {hasRealProfilePic(selectedUser.profilePicture) ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ src: selectedUser.profilePicture, title: `${selectedUser.name} - Profile Photo` })}
                    className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-muted shrink-0 mx-auto md:mx-0 group shadow-md cursor-pointer hover:ring-4 hover:ring-primary/20 transition-all block"
                    title="Click to inspect profile photo"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedUser.profilePicture}
                      alt={selectedUser.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold">
                      <svg className="w-4 h-4 mb-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                      </svg>
                      <span>Enlarge</span>
                    </div>
                  </button>
                ) : (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-muted shrink-0 mx-auto md:mx-0 flex items-center justify-center font-bold text-3xl text-muted-foreground">
                    {selectedUser.name[0]?.toUpperCase() || '?'}
                  </div>
                )}
                
                <div className="space-y-2 text-center md:text-left flex-1 w-full">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2.5">
                        <h3 className="text-2xl font-bold text-foreground">{selectedUser.name}</h3>
                        <button
                          type="button"
                          onClick={() => openEditNameModal(selectedUser.id, selectedUser.name, selectedUser.id.startsWith('code-'))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-muted border border-border transition cursor-pointer shadow-2xs"
                          title="Edit member name"
                        >
                          <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                          <span>Edit Name</span>
                        </button>
                      </div>
                      <p className="text-muted-foreground">{selectedUser.email}</p>
                    </div>
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedUser.status === 'APPROVED'
                          ? 'bg-green-500/10 text-green-500'
                          : selectedUser.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-500'
                          : selectedUser.status === 'NOT_ACTIVATED'
                          ? 'bg-blue-500/10 text-blue-500'
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
                      {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'N/A'}
                    </div>
                    <div>
                      <span className="block font-semibold text-foreground text-xs">CREATED DATE</span>
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Unactivated Informational Banner */}
              {selectedUser.status === 'NOT_ACTIVATED' && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Account Awaiting Member Activation</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      This member was imported from the master ledger and has been assigned <strong className="font-mono text-foreground font-semibold">{selectedUser.email}</strong>.
                      They have not yet completed online signup or uploaded their passport photograph. Once they activate their account using their 6-digit registration code at <span className="font-mono text-foreground font-semibold">/register</span>, their submitted photo and birth certificate will appear here for verification.
                    </p>
                  </div>
                </div>
              )}

              {/* Verification Documents Block */}
              {selectedUser.status !== 'NOT_ACTIVATED' ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                    Verification Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Profile Photo Card */}
                    <div className="bg-muted/30 border border-border p-4 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {hasRealProfilePic(selectedUser.profilePicture) ? (
                          <div 
                            className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 cursor-pointer bg-muted"
                            onClick={() => setPreviewImage({ src: selectedUser.profilePicture, title: `${selectedUser.name} - Profile Photo` })}
                            title="Click to preview"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedUser.profilePicture}
                              alt="Profile Preview"
                              className="w-full h-full object-cover hover:scale-110 transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">Passport / Profile Photo</h4>
                          <p className="text-xs text-muted-foreground">Official applicant facial photograph.</p>
                        </div>
                      </div>
                      {hasRealProfilePic(selectedUser.profilePicture) ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: selectedUser.profilePicture, title: `${selectedUser.name} - Profile Photo` })}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                          </button>
                          <a
                            href={selectedUser.profilePicture}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold transition"
                          >
                            Full ↗
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic shrink-0">No Photo</span>
                      )}
                    </div>

                    {/* Birth Certificate Card */}
                    <div className="bg-muted/30 border border-border p-4 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-6 h-6 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
                        </svg>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate">Birth Certificate</h4>
                          <p className="text-xs text-muted-foreground">Proof of age / baptismal record.</p>
                        </div>
                      </div>
                      {selectedUser.birthCert && !selectedUser.birthCert.includes('placeholder') ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ src: selectedUser.birthCert, title: `${selectedUser.name} - Birth Certificate` })}
                            className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <span>Preview</span>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                          </button>
                          <a
                            href={selectedUser.birthCert}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold transition"
                          >
                            Open ↗
                          </a>
                        </div>
                      ) : selectedUser.birthCert ? (
                        <a
                          href={selectedUser.birthCert}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-primary hover:opacity-90 text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold transition shrink-0"
                        >
                          Open Document
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic shrink-0">None</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
                    Verification Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/20 border border-dashed border-border p-4 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-60">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Passport / Profile Photo</h4>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Awaiting member upload upon activation</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-1 rounded font-medium shrink-0">Pending Signup</span>
                    </div>

                    <div className="bg-muted/20 border border-dashed border-border p-4 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground opacity-60">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Birth Certificate</h4>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Awaiting member upload upon activation</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-1 rounded font-medium shrink-0">Pending Signup</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Document Update Banner if user has submitted updates */}
              {selectedUser.pendingMediaStatus === 'PENDING' && (
                <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.1.8-1.3-4.5-2.7V7z" />
                        </svg>
                        <span>Pending Document Update Under Review</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {selectedUser.pendingMediaSubmittedAt ? new Date(selectedUser.pendingMediaSubmittedAt).toLocaleString() : 'Recently'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDeclineMediaModal({
                          isOpen: true,
                          userId: selectedUser.id,
                          userName: selectedUser.name,
                          feedback: '',
                        })}
                        className="bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Decline Update
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Approve document update for ${selectedUser.name}? Old files will be replaced in storage.`)) {
                            handleMediaAction(selectedUser.id, 'APPROVE');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Approve Update
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {selectedUser.pendingProfilePicture && (
                      <div className="bg-card/70 border border-blue-500/20 p-3 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-500 bg-muted shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedUser.pendingProfilePicture} alt="New Profile" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">New Profile Picture</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Awaiting Approval</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: selectedUser.pendingProfilePicture!, title: `${selectedUser.name} - Proposed New Profile Photo` })}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 rounded font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {selectedUser.pendingBirthCert && (
                      <div className="bg-card/70 border border-blue-500/20 p-3 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <svg className="w-6 h-6 text-primary shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v6h6v10H6z" />
                          </svg>
                          <div>
                            <span className="font-bold text-foreground block">New Birth Certificate</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Awaiting Approval</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: selectedUser.pendingBirthCert!, title: `${selectedUser.name} - Proposed Birth Certificate` })}
                          className="bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1.5 rounded font-semibold cursor-pointer flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Section */}
              {selectedUser.financials && (
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-foreground">Financial Ledger</h4>
                  
                  {/* Financial Stats Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                      <span className="block text-xs font-semibold text-primary">WALLET BALANCE</span>
                      <span className="text-2xl font-bold text-primary">
                        ₦{(selectedUser.financials.walletBalance || 0).toLocaleString()}
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
                              {confirmingMarkPaidId === item.dueId ? (
                                <div className="flex gap-1 items-center">
                                  <button
                                    onClick={() => {
                                      setConfirmingMarkPaidId(null);
                                      executeMarkPaid(selectedUser.id, item.dueId);
                                    }}
                                    disabled={isMarkingPaid !== null}
                                    className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setConfirmingMarkPaidId(null)}
                                    className="bg-secondary text-foreground border border-border text-[10px] font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmingMarkPaidId(item.dueId)}
                                  disabled={isMarkingPaid !== null}
                                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-[11px] font-bold px-2 py-1 rounded transition whitespace-nowrap cursor-pointer"
                                >
                                  {isMarkingPaid === item.dueId ? '...' : 'Mark Paid'}
                                </button>
                              )}
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

              {/* Flagged Status Banner */}
              {selectedUser.status === 'FLAGGED' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-sm mt-4 text-amber-600 dark:text-amber-400 font-semibold flex items-start gap-2.5">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span>This profile is currently flagged for revision.</span>
                    <span className="block text-xs text-muted-foreground font-normal mt-1">
                      Reason: {selectedUser.flaggedReason === 'DOCUMENT_MISMATCH' && 'Information mismatch on documents.'}
                      {selectedUser.flaggedReason === 'INVALID_BIRTH_CERT' && 'User did not upload correct birth certificate.'}
                      {selectedUser.flaggedReason === 'INVALID_PROFILE_PIC' && 'Profile picture not visible or inappropriate.'}
                      {selectedUser.flaggedReason === 'INCOMPLETE_NAME' && 'Incomplete name details.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Flagging Option */}
              {selectedUser.status !== 'REJECTED' && selectedUser.status !== 'FLAGGED' && selectedUser.status !== 'NOT_ACTIVATED' && (
                <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl space-y-3 mt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400">Flag Account for Revision</h4>
                      <p className="text-xs text-muted-foreground">Ask the user to correct or upload specific information before approval.</p>
                    </div>
                    {!showFlagForm && (
                      <button
                        onClick={() => setShowFlagForm(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Request Revision
                      </button>
                    )}
                  </div>

                  {showFlagForm && (
                    <div className="flex flex-col sm:flex-row gap-3 items-end pt-2 border-t border-orange-500/10">
                      <div className="flex-1 w-full space-y-1">
                        <label className="block text-xs font-semibold text-foreground">Select Lacking Item / Issue:</label>
                        <select
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background text-foreground text-xs px-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="DOCUMENT_MISMATCH">Information on document mismatch</option>
                          <option value="INVALID_BIRTH_CERT">User did not upload correct birth certificate</option>
                          <option value="INVALID_PROFILE_PIC">Profile picture not visible or inappropriate picture</option>
                          <option value="INCOMPLETE_NAME">Incomplete name (missing middle name or wrong order)</option>
                        </select>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          onClick={() => {
                            setShowFlagForm(false);
                            setFlagReason('DOCUMENT_MISMATCH');
                          }}
                          className="bg-secondary hover:bg-muted text-foreground text-xs font-semibold px-3 py-2 rounded-lg border border-border cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleFlagUser(selectedUser.id)}
                          disabled={isFlagging}
                          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
                        >
                          {isFlagging ? 'Flagging...' : 'Confirm Flag'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:gap-3">
              
              {/* If user is NOT_ACTIVATED, show Regenerate Code button */}
              {selectedUser.status === 'NOT_ACTIVATED' && (
                <button
                  onClick={() => {
                    const codeId = selectedUser.id.replace('code-', '');
                    handleRegenerateCode(codeId, selectedUser.name);
                    setSelectedUser(null);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer w-full sm:w-auto text-center"
                >
                  Regenerate Code
                </button>
              )}

              {/* If user is PENDING approval, show approve/reject buttons in the modal too! */}
              {selectedUser.status === 'PENDING_APPROVAL' && (
                <>
                  {confirmingUserAction && confirmingUserAction.userId === selectedUser.id ? (
                    <div className="flex flex-wrap gap-2 items-center mr-auto bg-orange-500/5 border border-orange-500/20 px-3 py-1.5 rounded-lg animate-pulse-subtle">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        Confirm {confirmingUserAction.action === 'APPROVE' ? 'Approve' : 'Reject'} Member?
                      </span>
                      <button
                        onClick={() => {
                          executeUserAction(selectedUser.id, confirmingUserAction.action);
                          setConfirmingUserAction(null);
                          setSelectedUser(null);
                        }}
                        disabled={actioningId !== null}
                        className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-semibold transition cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmingUserAction(null)}
                        className="bg-secondary text-foreground border border-border px-3 py-1 rounded text-xs font-semibold transition cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setConfirmingUserAction({ userId: selectedUser.id, action: 'APPROVE' })}
                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center"
                      >
                        Approve Member
                      </button>
                      <button
                        onClick={() => setConfirmingUserAction({ userId: selectedUser.id, action: 'REJECT' })}
                        className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer text-center"
                      >
                        Reject Member
                      </button>
                    </div>
                  )}
                </>
              )}
              
              <button
                onClick={() => setSelectedUser(null)}
                className="bg-secondary text-foreground hover:bg-muted border border-border px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer w-full sm:w-auto text-center"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Transaction Modal */}
      {bulkModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className={`absolute top-0 left-0 w-full h-1.5 ${bulkModal.type === 'DEPOSIT' ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-red-600 to-orange-500'}`}></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                {bulkModal.type === 'DEPOSIT' ? 'Pay Bulk Dues' : 'Bulk Withdrawal / Deduction'}
              </h2>
              <button
                onClick={() => setBulkModal(prev => ({ ...prev, isOpen: false }))}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleBulkSubmit}>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">Transaction Type</label>
                  <select
                    value={bulkModal.type}
                    onChange={(e) => setBulkModal(prev => ({ ...prev, type: e.target.value as 'DEPOSIT' | 'WITHDRAW' }))}
                    className="w-full rounded-lg border border-input bg-background text-foreground text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none animate-none"
                  >
                    <option value="DEPOSIT">Deposit (Pay Bulk Dues)</option>
                    <option value="WITHDRAW">Withdraw (Deduct Payment)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">Select Member</label>
                  <select
                    value={bulkModal.selectedUserId}
                    required
                    onChange={(e) => setBulkModal(prev => ({ ...prev, selectedUserId: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background text-foreground text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Choose Member --</option>
                    {approvedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">Amount (₦)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Enter amount to transact"
                    value={bulkModal.amount}
                    onChange={(e) => setBulkModal(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background text-foreground text-sm px-3 py-2.5 focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-muted/20 border-t border-border flex justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setBulkModal(prev => ({ ...prev, isOpen: false }))}
                  className="bg-secondary text-foreground hover:bg-muted border border-border px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition text-white cursor-pointer ${bulkModal.type === 'DEPOSIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                >
                  {isBulkSubmitting ? 'Processing...' : bulkModal.type === 'DEPOSIT' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Document Update Feedback Modal */}
      {declineMediaModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Decline Document Update
              </h2>
              <button
                onClick={() => setDeclineMediaModal({ isOpen: false, userId: '', userName: '', feedback: '' })}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-sm text-foreground">
                You are declining the proposed document update for <strong className="font-semibold">{declineMediaModal.userName}</strong>.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                The newly uploaded file(s) will be safely deleted from storage. The member's current active profile picture and birth certificate will remain untouched.
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase">
                  Reason / Feedback for Member (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Image is blurry, or document does not match account name."
                  value={declineMediaModal.feedback}
                  onChange={(e) => setDeclineMediaModal(prev => ({ ...prev, feedback: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background text-foreground text-sm p-3 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-muted/20 border-t border-border flex justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setDeclineMediaModal({ isOpen: false, userId: '', userName: '', feedback: '' })}
                className="bg-secondary text-foreground hover:bg-muted border border-border px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actioningMediaId !== null}
                onClick={() => handleMediaAction(declineMediaModal.userId, 'REJECT', declineMediaModal.feedback)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {actioningMediaId ? 'Declining...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Full-size Image Inspection Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-card max-w-3xl w-full max-h-[90vh] rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-muted/40">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{previewImage.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.src}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  Open in New Tab ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-3.5 sm:p-6 flex-1 flex items-center justify-center bg-black/30 overflow-auto min-h-[280px] max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-h-[70vh] max-w-full w-auto object-contain rounded-lg shadow-xl border border-border/50"
              />
            </div>
            <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
              <span>Click outside or click Close</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="bg-secondary text-secondary-foreground px-4 py-1.5 rounded-lg font-semibold hover:opacity-90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Name Modal */}
      {editNameModal.isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !isEditingName && setEditNameModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Edit Member Name</h3>
                  <p className="text-[11px] text-muted-foreground">Fix typos without affecting account records</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isEditingName}
                onClick={() => setEditNameModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveName} className="p-5 space-y-4">
              {/* Informative Assurance Callout */}
              <div className="bg-secondary/40 border border-border/80 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="leading-relaxed">
                  Only the member&apos;s name will be updated. All financial payments, dues ledger, uploaded documents, and login credentials remain completely intact and linked.
                </span>
              </div>

              {editNameError && (
                <div className="bg-destructive/10 text-destructive border border-destructive/20 text-xs p-3 rounded-xl font-medium">
                  {editNameError}
                </div>
              )}

              {editNameSuccess && (
                <div className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>{editNameSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Current Name
                </label>
                <div className="px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-xs sm:text-sm font-semibold text-foreground">
                  {editNameModal.currentName}
                </div>
              </div>

              <div>
                <label htmlFor="new-member-name" className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider">
                  Corrected Full Name *
                </label>
                <input
                  id="new-member-name"
                  type="text"
                  required
                  value={editNameModal.newName}
                  onChange={(e) => setEditNameModal((prev) => ({ ...prev, newName: e.target.value }))}
                  placeholder="Enter full name"
                  autoFocus
                  disabled={isEditingName}
                  className="block w-full px-3.5 py-2.5 border border-border bg-background text-foreground rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm shadow-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
                <button
                  type="button"
                  disabled={isEditingName}
                  onClick={() => setEditNameModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 border border-border text-xs font-semibold rounded-xl text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingName || !editNameModal.newName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isEditingName ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>Save Name</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}