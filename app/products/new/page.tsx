'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct } from '@/actions/products';
import { toast } from 'sonner';

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createProduct(formData);
      toast.success('Product created!');
      router.push(`/products/${result.productId}`);
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="page-header mb-0">🍬 New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Product Info</h2>
          <div>
            <label className="label">Product Name *</label>
            <input name="name" className="input" placeholder="e.g. Mango Gummy" required />
          </div>
          <div>
            <label className="label">Variant</label>
            <input name="variant" className="input" placeholder="e.g. Peach, Spicy, Original" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU *</label>
              <input name="sku" className="input" placeholder="MG-PCH-001" required />
            </div>
            <div>
              <label className="label">Packs per Box *</label>
              <input name="packsPerBox" type="number" className="input" defaultValue={24} min={1} required />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={2} placeholder="Optional notes..." />
          </div>
        </div>

        {/* Pricing */}
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Pricing</h2>
          <div>
            <label className="label">Cost per Box ($) *</label>
            <input name="costPerBox" type="number" step="0.01" className="input" placeholder="18.00" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Retail / Pack ($)</label>
              <input name="retailPricePerPack" type="number" step="0.01" className="input" placeholder="1.50" />
            </div>
            <div>
              <label className="label">Retail / Box ($)</label>
              <input name="retailPricePerBox" type="number" step="0.01" className="input" placeholder="30.00" />
            </div>
          </div>
          <div>
            <label className="label">Wholesale / Box ($)</label>
            <input name="wholesalePricePerBox" type="number" step="0.01" className="input" placeholder="25.00" />
            <p className="text-xs text-gray-400 mt-1">Default consignment price. Can override per store.</p>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating...' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
