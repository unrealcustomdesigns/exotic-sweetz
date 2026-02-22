'use client';

import { useState } from 'react';
import { deactivateVendor, reactivateVendor } from '@/actions/vendors';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function VendorStatusButton({
  vendorId,
  vendorName,
  isActive,
}: {
  vendorId: string;
  vendorName: string;
  isActive: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await deactivateVendor(vendorId);
        toast.success(`${vendorName} deactivated`);
        router.push('/vendors');
      } else {
        await reactivateVendor(vendorId);
        toast.success(`${vendorName} reactivated`);
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
          {isActive ? 'Deactivate' : 'Reactivate'} {vendorName}?
        </p>
        <p className="text-xs text-red-600 mb-3">
          {isActive
            ? 'This vendor will be hidden from the Receive form. Past movements are kept.'
            : 'This vendor will appear in the Receive form again.'}
        </p>
        <div className="flex gap-2">
          <button onClick={handleAction} disabled={loading} className={isActive ? 'btn-danger flex-1' : 'btn-primary flex-1'}>
            {loading ? 'Processing...' : isActive ? 'Yes, Deactivate' : 'Yes, Reactivate'}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={`mt-4 w-full ${isActive ? 'btn-danger' : 'btn-primary'}`}>
      {isActive ? '🗑️ Deactivate Vendor' : '♻️ Reactivate Vendor'}
    </button>
  );
}
