'use client';

import { useState } from 'react';
import { deactivateStore, reactivateStore } from '@/actions/locations';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function StoreStatusButton({
  storeId,
  storeName,
  isActive,
}: {
  storeId: string;
  storeName: string;
  isActive: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await deactivateStore(storeId);
        toast.success(`${storeName} deactivated`);
        router.push('/stores');
      } else {
        await reactivateStore(storeId);
        toast.success(`${storeName} reactivated`);
        router.refresh();
      }
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="card border-red-200 bg-red-50 mt-4">
        <p className="text-sm font-bold text-red-700 mb-2">
          {isActive ? 'Deactivate' : 'Reactivate'} {storeName}?
        </p>
        <p className="text-xs text-red-600 mb-3">
          {isActive
            ? 'The store and its location will be hidden from all forms. Past data is preserved.'
            : 'The store and its location will reappear in forms.'}
        </p>
        <div className="flex gap-2">
          <button onClick={handleAction} disabled={loading} className={isActive ? 'btn-danger flex-1' : 'btn-primary flex-1'}>
            {loading ? 'Processing...' : isActive ? 'Yes, Deactivate' : 'Yes, Reactivate'}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={`mt-4 w-full ${isActive ? 'btn-danger' : 'btn-primary'}`}>
      {isActive ? '🗑️ Deactivate Store' : '♻️ Reactivate Store'}
    </button>
  );
}
