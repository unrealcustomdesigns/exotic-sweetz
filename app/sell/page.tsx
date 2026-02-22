'use client';

import { useState, useEffect } from 'react';
import { recordSale } from '@/actions/movements';
import { toast } from 'sonner';

type Product = { id: string; name: string; variant?: string | null };
type Location = { id: string; name: string; locationType: string };

export default function SellPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [unitType, setUnitType] = useState<'PACK' | 'BOX'>('PACK');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastSale, setLastSale] = useState<{ totalPrice: number } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/form-options');
      const data = await res.json();
      setProducts(data.products);
      setLocations([...data.shelfLocations, ...data.storageLocations]);
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
      formData.set('unitType', unitType);
      const result = await recordSale(formData);
      setLastSale({ totalPrice: result.totalPrice });
      toast.success(`Sale recorded: $${result.totalPrice.toFixed(2)}`);
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
      <h1 className="page-header">💰 Record Sale</h1>

      {lastSale && (
        <div className="card bg-green-50 border-green-200 mb-4 text-center">
          <div className="text-lg font-bold text-green-700">${lastSale.totalPrice.toFixed(2)}</div>
          <div className="text-xs text-green-600">Last sale recorded</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unit type toggle */}
        <div>
          <label className="label">Selling</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUnitType('PACK')}
              className={`btn ${unitType === 'PACK' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Packs
            </button>
            <button
              type="button"
              onClick={() => setUnitType('BOX')}
              className={`btn ${unitType === 'BOX' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Full Box
            </button>
          </div>
        </div>

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
            <option value="">Where is product?</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.locationType})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantity</label>
            <input name="quantity" type="number" className="input" min={1} defaultValue={1} required inputMode="numeric" />
          </div>
          <div>
            <label className="label">Price / {unitType === 'PACK' ? 'pack' : 'box'} ($)</label>
            <input name="pricePerUnit" type="number" step="0.01" className="input" placeholder="1.50" required inputMode="decimal" />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Recording...' : 'Record Sale'}
        </button>
      </form>
    </div>
  );
}
