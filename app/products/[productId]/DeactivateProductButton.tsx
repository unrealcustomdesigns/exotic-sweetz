'use client';

import { useState } from 'react';
import { deactivateProduct, reactivateProduct } from '@/actions/products';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function DeactivateProductButton({
  productId,
  productName,
  isActive,
}: {
  productId: string;
  productName: string;
  isActive: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isActive) {
        await deactivateProduct(productId);
        toast.success(`${productName} has been deactivated`);
        router.push('/products');
      } else {
        await reactivateProduct(productId);
        toast.success(`${productName} has been reactivated`);
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
      <div className="card border-red-200 bg-red-50 mt-6">
        <p className="text-sm font-bold text-red-700 mb-2">
          {isActive ? 'Deactivate' : 'Reactivate'} {productName}?
        </p>
        <p className="text-xs text-red-600 mb-3">
          {isActive
            ? 'This will hide the product from all forms and dropdowns. Existing movement history is preserved. You can reactivate it later.'
            : 'This will make the product visible again in all forms and dropdowns.'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleAction}
            disabled={loading}
            className={isActive ? 'btn-danger flex-1' : 'btn-primary flex-1'}
          >
            {loading
              ? 'Processing...'
              : isActive
              ? 'Yes, Deactivate'
              : 'Yes, Reactivate'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`mt-6 w-full ${isActive ? 'btn-danger' : 'btn-primary'}`}
    >
      {isActive ? '🗑️ Deactivate Product' : '♻️ Reactivate Product'}
    </button>
  );
}
