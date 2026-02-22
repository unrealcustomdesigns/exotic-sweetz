'use client';

import { useState, useEffect } from 'react';
import { convertBoxToPacks } from '@/actions/movements';
import { toast } from 'sonner';

type Product = { id: string; name: string; variant?: string | null; packsPerBox: number };
type Location = { id: string; name: string; locationType: string };

export default function ConvertPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ packsCreated: number } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/form-options');
      const data = await res.json();
      setProducts(data.products);
      setLocations([...data.storageLocations, ...data.shelfLocations]);
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await convertBoxToPacks(formData);
      setResult({ packsCreated: res.packsCreated });
      toast.success(`Created ${res.packsCreated} packs!`);
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  if (result) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🔄</div>
        <h2 className="text-lg font-bold mb-1">Conversion Complete!</h2>
        <p className="text-sm text-gray-500 mb-2">
          {quantity} box(es) → <span className="font-bold text-brand-600">{result.packsCreated} packs</span>
        </p>
        <button onClick={() => { setResult(null); setQuantity(1); }} className="btn-primary mt-4">
          Convert More
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-header">🔄 Convert Box → Packs</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Product</label>
          <select
            name="productId"
            className="input"
            required
            onChange={(e) => {
              const p = products.find((p) => p.id === e.target.value);
              setSelectedProduct(p || null);
            }}
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.variant && `(${p.variant})`} — {p.packsPerBox} packs/box
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Location</label>
          <select name="locationId" className="input" required>
            <option value="">Where are the boxes?</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.locationType})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Boxes to Convert</label>
          <input
            name="quantity"
            type="number"
            className="input text-center text-lg font-bold"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            required
            inputMode="numeric"
          />
          {selectedProduct && (
            <p className="text-center text-sm text-brand-600 font-medium mt-1">
              = {quantity * selectedProduct.packsPerBox} packs
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Converting...' : 'Convert'}
        </button>
      </form>
    </div>
  );
}
