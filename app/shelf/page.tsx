'use client';

import { useState, useEffect } from 'react';
import { transferInventory } from '@/actions/movements';
import { toast } from 'sonner';

type Option = { id: string; name: string; variant?: string | null; locationType?: string };

export default function ShelfPage() {
  const [mode, setMode] = useState<'put' | 'take'>('put');
  const [products, setProducts] = useState<Option[]>([]);
  const [storageLocations, setStorageLocations] = useState<Option[]>([]);
  const [shelfLocations, setShelfLocations] = useState<Option[]>([]);
  const [truckLocations, setTruckLocations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unitType, setUnitType] = useState<'BOX' | 'PACK'>('BOX');

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/form-options');
      const data = await res.json();
      setProducts(data.products);
      setStorageLocations(data.storageLocations);
      setShelfLocations(data.shelfLocations);
      setTruckLocations(data.truckLocations);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);
    try {
      const formData = new FormData(form);
      formData.set('action', mode === 'put' ? 'PUT_ON_SHELF' : 'TAKE_OFF_SHELF');
      formData.set('unitType', unitType);
      await transferInventory(formData);
      toast.success(mode === 'put' ? 'Put on shelf!' : 'Taken off shelf!');
      form.reset();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <h1 className="page-header">📥 Shelf Management</h1>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMode('put')}
          className={`btn text-sm ${mode === 'put' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          📥 Put ON Shelf
        </button>
        <button
          onClick={() => setMode('take')}
          className={`btn text-sm ${mode === 'take' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          📤 Take OFF Shelf
        </button>
      </div>

      <div className="card mb-3 bg-gray-50">
        <div className="text-xs text-gray-500">
          {mode === 'put'
            ? 'Move product from Storage → Shelf for display or retail.'
            : 'Remove product from Shelf → Storage or Truck.'}
        </div>
      </div>

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

        {/* Unit type toggle */}
        <div>
          <label className="label">Unit Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUnitType('BOX')}
              className={`btn text-sm ${unitType === 'BOX' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              📦 Boxes
            </button>
            <button
              type="button"
              onClick={() => setUnitType('PACK')}
              className={`btn text-sm ${unitType === 'PACK' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              🍬 Packs
            </button>
          </div>
        </div>

        <div>
          <label className="label">{mode === 'put' ? 'From (Storage)' : 'From (Shelf)'}</label>
          <select name="fromLocationId" className="input" required>
            <option value="">Select source...</option>
            {(mode === 'put' ? storageLocations : shelfLocations).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">{mode === 'put' ? 'To (Shelf)' : 'To (Storage or Truck)'}</label>
          <select name="toLocationId" className="input" required>
            <option value="">Select destination...</option>
            {(mode === 'put' ? shelfLocations : [...storageLocations, ...truckLocations]).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} {l.locationType ? `(${l.locationType})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Quantity</label>
          <input name="quantity" type="number" className="input" min={1} defaultValue={1} required inputMode="numeric" />
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <input name="notes" className="input" placeholder="Optional notes..." />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Moving...' : mode === 'put' ? '📥 Put on Shelf' : '📤 Take off Shelf'}
        </button>
      </form>
    </div>
  );
}
