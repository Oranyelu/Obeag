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

interface Contributor {
  id: string;
  name: string;
  email: string;
  amount: number;
}

interface Due {
  id: string;
  title: string;
  description?: string;
  amount: number;
  type: string;
  dueDate: string;
  createdAt?: string;
  contributorsCount?: number;
  totalCollected?: number;
  contributors?: Contributor[];
}

export default function ManageDuesPage() {
  const [dues, setDues] = useState<Due[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    due: Due | null;
  }>({
    isOpen: false,
    due: null,
  });
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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
    setActionMessage(null);
    try {
      const res = await fetch('/api/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        reset();
        setActionMessage({
          type: 'success',
          text: `Due "${data.title}" successfully created.`
        });
        fetchDues();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create due');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while creating due');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (due: Due) => {
    setDeleteModal({
      isOpen: true,
      due,
    });
    setActionMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.due) return;
    setIsDeleting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/dues', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueId: deleteModal.due.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: data.message || `Due "${deleteModal.due.title}" successfully deleted.`,
        });
        setDeleteModal({ isOpen: false, due: null });
        await fetchDues();
      } else {
        alert(data.error || 'Failed to delete due');
      }
    } catch (err) {
      console.error('Error deleting due:', err);
      alert('An error occurred while deleting the due.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='max-w-5xl mx-auto w-full min-w-0 space-y-6 sm:space-y-8'>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className='text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight'>Manage Dues</h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-1'>
            Create, configure, and manage association membership dues and levies.
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl border text-sm font-semibold flex items-start justify-between gap-3 animate-in fade-in duration-200 ${
          actionMessage.type === 'success'
            ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
            : 'bg-destructive/10 border-destructive/20 text-destructive'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {actionMessage.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              )}
            </svg>
            <span className="leading-relaxed">{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-current opacity-70 hover:opacity-100 p-0.5 rounded cursor-pointer"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Create New Due Card */}
      <div className='bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-border'>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h2 className='text-lg font-bold text-foreground'>Create New Due</h2>
            <p className="text-xs text-muted-foreground">Assign a new monthly or occasional levy to all members</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5'>Title *</label>
              <input
                {...register('title')}
                placeholder='e.g., Annual Youth Empowerment Levy 2026'
                className='block w-full rounded-xl border-border bg-background text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary border px-3.5 py-2.5 text-sm'
              />
              {errors.title && <p className='text-destructive text-xs mt-1 font-semibold'>{errors.title.message}</p>}
            </div>

            <div>
              <label className='block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5'>Amount (₦) *</label>
              <input
                type='number'
                step='0.01'
                placeholder='5000'
                {...register('amount', { valueAsNumber: true })}
                className='block w-full rounded-xl border-border bg-background text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary border px-3.5 py-2.5 text-sm'
              />
              {errors.amount && <p className='text-destructive text-xs mt-1 font-semibold'>{errors.amount.message}</p>}
            </div>

            <div>
              <label className='block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5'>Due Type *</label>
              <select
                {...register('type')}
                className='block w-full rounded-xl border-border bg-background text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary border px-3.5 py-2.5 text-sm'
              >
                <option value='MONTHLY'>Monthly Due</option>
                <option value='OCCASIONAL'>Occasional / Special Levy</option>
              </select>
            </div>

            <div>
              <label className='block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5'>Due Date *</label>
              <input
                type='datetime-local'
                {...register('dueDate')}
                className='block w-full rounded-xl border-border bg-background text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary border px-3.5 py-2.5 text-sm'
              />
              {errors.dueDate && <p className='text-destructive text-xs mt-1 font-semibold'>{errors.dueDate.message}</p>}
            </div>
          </div>

          <div>
            <label className='block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5'>Description (Optional)</label>
            <textarea
              rows={2}
              placeholder='Optional notes or details regarding this due item...'
              {...register('description')}
              className='block w-full rounded-xl border-border bg-background text-foreground shadow-xs focus:border-primary focus:ring-2 focus:ring-primary border px-3.5 py-2.5 text-sm'
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type='submit'
              disabled={isLoading}
              className='flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition font-bold text-sm cursor-pointer shadow-md shadow-primary/20'
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Creating Due...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Create Due</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Dues Table */}
      <div className='bg-card p-5 sm:p-6 rounded-2xl shadow-sm border border-border'>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className='text-lg font-bold text-foreground'>Existing Dues ({dues.length})</h2>
            <p className="text-xs text-muted-foreground">Manage active dues or cancel dues with automatic wallet balance refunds</p>
          </div>
          <button
            type="button"
            onClick={fetchDues}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <div className='overflow-x-auto rounded-xl border border-border'>
          <table className='min-w-full divide-y divide-border'>
            <thead className='bg-muted/60'>
              <tr>
                <th className='px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider'>Title & Notes</th>
                <th className='px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider'>Amount</th>
                <th className='px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider'>Type</th>
                <th className='px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider'>Due Date</th>
                <th className='px-4 sm:px-6 py-3.5 text-left text-xs font-bold text-foreground uppercase tracking-wider'>Contributors</th>
                <th className='px-4 sm:px-6 py-3.5 text-center text-xs font-bold text-foreground uppercase tracking-wider'>Actions</th>
              </tr>
            </thead>
            <tbody className='bg-card divide-y divide-border'>
              {dues.map((due) => {
                const contributorsCount = due.contributorsCount || 0;
                const totalCollected = due.totalCollected || 0;

                return (
                  <tr key={due.id} className='hover:bg-muted/30 transition-colors'>
                    <td className='px-4 sm:px-6 py-4'>
                      <div className='text-sm font-semibold text-foreground'>{due.title}</div>
                      {due.description && (
                        <div className='text-xs text-muted-foreground mt-0.5 line-clamp-1'>{due.description}</div>
                      )}
                    </td>
                    <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-extrabold text-primary font-mono'>
                      ₦{due.amount.toLocaleString()}
                    </td>
                    <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm'>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        due.type === 'MONTHLY' 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {due.type}
                      </span>
                    </td>
                    <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground'>
                      {new Date(due.dueDate).toLocaleDateString()}
                    </td>
                    <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-sm'>
                      {contributorsCount > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 w-fit">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>{contributorsCount} paid</span>
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            ₦{totalCollected.toLocaleString()} collected
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No contributors yet</span>
                      )}
                    </td>
                    <td className='px-4 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium'>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(due)}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition cursor-pointer'
                        title="Delete this due and refund contributors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {dues.length === 0 && (
                <tr>
                  <td colSpan={6} className='px-4 sm:px-6 py-10 text-center text-sm text-muted-foreground'>
                    No dues created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Due Confirmation Modal with Automatic Wallet Refund Guarantee */}
      {deleteModal.isOpen && deleteModal.due && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setDeleteModal({ isOpen: false, due: null })}
        >
          <div 
            className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Delete Due Item</h3>
                  <p className="text-xs text-muted-foreground">Confirm removal of this due from the association</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, due: null })}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Due Details Card */}
              <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Due Title</span>
                    <p className="text-sm font-bold text-foreground">{deleteModal.due.title}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-secondary text-foreground shrink-0">
                    {deleteModal.due.type}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <span>Amount: <strong className="text-foreground font-mono">₦{deleteModal.due.amount.toLocaleString()}</strong></span>
                  <span>Due Date: <strong className="text-foreground">{new Date(deleteModal.due.dueDate).toLocaleDateString()}</strong></span>
                </div>
              </div>

              {/* Contributors & Excess Wallet Refund Callout */}
              {(deleteModal.due.contributorsCount || 0) > 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                        Automatic Wallet Balance Refund
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                        <strong>{deleteModal.due.contributorsCount} member(s)</strong> have already paid <strong>₦{(deleteModal.due.totalCollected || 0).toLocaleString()}</strong> towards this due.
                      </p>
                      <p className="text-xs text-amber-700/90 dark:text-amber-400/90 mt-1 leading-relaxed">
                        Deleting this due will immediately credit each member&apos;s contributed amount back to their personal wallet balance so they do not lose funds.
                      </p>
                    </div>
                  </div>

                  {/* Contributor List Breakdown */}
                  {deleteModal.due.contributors && deleteModal.due.contributors.length > 0 && (
                    <div className="max-h-36 overflow-y-auto divide-y divide-border/60 border border-amber-500/20 rounded-lg bg-card/80">
                      {deleteModal.due.contributors.map((c) => (
                        <div key={c.id} className="flex justify-between items-center py-2 px-3 text-xs">
                          <span className="font-semibold text-foreground truncate pr-2">{c.name}</span>
                          <span className="font-mono font-bold text-green-600 dark:text-green-400 shrink-0">
                            +₦{c.amount.toLocaleString()} to wallet
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-secondary/40 border border-border/80 rounded-xl p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <span className="leading-relaxed">
                    No members have contributed to this due yet. It can be safely removed with 0 wallet adjustments.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal({ isOpen: false, due: null })}
                className="px-4 py-2 border border-border text-xs font-semibold rounded-xl text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Deleting & Crediting Wallets...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    <span>
                      {(deleteModal.due.contributorsCount || 0) > 0 ? 'Delete & Refund Wallets' : 'Confirm Delete'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}