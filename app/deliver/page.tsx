'use client';

import { useState, useEffect } from 'react';
import { transferInventory } from '@/actions/movements';
import { toast } from 'sonner';

type Option = { id: string; name: string; variant?: string | null; locationType?: string; store?: { id: string; name: string } | null };

export default function DeliverPage() {
  const [products, setProducts] = useState<Option[]>([]);
  const [fromLocations, setFromLocations] = useState<Option[]>([]);
  const [storeLocations, setStoreLocations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/form-options');
      const data = await res.json();
      setProducts(data.products);
      setFromLocations([...data.storageLocations, ...data.shelfLocations, ...data.truckLocations]);
      setStoreLocations(data.storeLocations);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set('action', 'DELIVER_TO_STORE');
      formData.set('unitType', 'BOX');

      // Find storeId from selected store location
      const toLocId = formData.get('toLocationId') as string;
      const storeLoc = storeLocations.find((l) => l.id === toLocId);
      if (storeLoc?.store?.id) formData.set('storeId', storeLoc.store.id);

      await transferInventory(formData);
      const qty = formData.get('quantity');
      const storeName = storeLoc?.store?.name || 'store';
      setSuccess(`Delivered ${qty} box(es) to ${storeName}`);
      toast.success('Delivery recorded!');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🚚</div>
        <h2 className="text-lg font-bold mb-1">Delivery Recorded!</h2>
        <p className="text-sm text-gray-500 mb-6">{success}</p>
        <button onClick={() => setSuccess(null)} className="btn-primary">
          Deliver More
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-header">🚚 Deliver to Store</h1>

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
          <label className="label">From Location</label>
          <select name="fromLocationId" className="input" required>
            <option value="">Select source...</option>
            {fromLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.locationType})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">To Store</label>
          <select name="toLocationId" className="input" required>
            <option value="">Select store...</option>
            {storeLocations.map((l) => (
              <option key={l.id} value={l.id}>{l.store?.name || l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Boxes to Deliver</label>
          <input name="quantity" type="number" className="input" min={1} defaultValue={1} required inputMode="numeric" />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea name="notes" className="input" rows={2} />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Recording...' : 'Record Delivery'}
        </button>
      </form>
    </div>
  );
}
