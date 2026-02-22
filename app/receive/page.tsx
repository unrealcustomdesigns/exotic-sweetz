'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { receiveInventory } from '@/actions/movements';
import { toast } from 'sonner';

type SimpleItem = { id: string; name: string; variant?: string | null };

export default function ReceivePage() {
  const router = useRouter();
  const [products, setProducts] = useState<SimpleItem[]>([]);
  const [vendors, setVendors] = useState<SimpleItem[]>([]);
  const [locations, setLocations] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/form-options');
      const data = await res.json();
      setProducts(data.products);
      setVendors(data.vendors);
      setLocations(data.storageLocations);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await receiveInventory(formData);
      toast.success(`Received ${formData.get('quantity')} boxes!`);
      e.currentTarget.reset();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="page-header">📦 Receive Inventory</h1>
      <p className="text-sm text-gray-500 -mt-3 mb-4">Record boxes received from a vendor</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Product</label>
          <select name="productId" className="input" required>
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.variant && `(${p.variant})`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Vendor</label>
          <select name="vendorId" className="input" required>
            <option value="">Select vendor...</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Boxes Received</label>
            <input name="quantity" type="number" className="input" min={1} defaultValue={1} required inputMode="numeric" />
          </div>
          <div>
            <label className="label">Cost / Box ($)</label>
            <input name="costPerBox" type="number" step="0.01" className="input" placeholder="18.00" required inputMode="decimal" />
          </div>
        </div>

        <div>
          <label className="label">Storage Location</label>
          <select name="toLocationId" className="input" required>
            <option value="">Select storage...</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea name="notes" className="input" rows={2} placeholder="PO number, condition notes..." />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Recording...' : 'Receive Inventory'}
        </button>
      </form>
    </div>
  );
}
