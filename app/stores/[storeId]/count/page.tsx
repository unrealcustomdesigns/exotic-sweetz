'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { submitStoreCount } from '@/actions/stores';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ProductForCount = {
  id: string;
  name: string;
  variant: string | null;
  lastRemaining: number | null;
  deliveredSince: number;
};

export default function StoreCountPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;

  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState<ProductForCount[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [countDate, setCountDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  // Load products that have been delivered to this store
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stores/${storeId}/count-products`);
        const data = await res.json();
        setStoreName(data.storeName);
        setProducts(data.products);
        // Pre-fill counts with empty strings
        const initial: Record<string, string> = {};
        data.products.forEach((p: ProductForCount) => {
          initial[p.id] = '';
        });
        setCounts(initial);
      } catch {
        toast.error('Failed to load store data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const handleSubmit = async () => {
    // Validate all counts are filled
    const entries = products.map((p) => ({
      productId: p.id,
      boxesRemaining: parseInt(counts[p.id] || '0', 10),
    }));

    const unfilled = entries.filter((e) => isNaN(e.boxesRemaining));
    if (unfilled.length > 0) {
      toast.error('Please fill in all counts');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitStoreCount(storeId, countDate, entries);
      setResults(result.results);
      toast.success('Count submitted!');
    } catch (err: any) {
      toast.error('Failed to submit', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Show results after submission
  if (results) {
    const totalOwed = results.reduce((sum, r) => sum + r.amountOwed, 0);
    const hasAnomalies = results.some((r) => r.hasAnomaly);

    return (
      <div>
        <h1 className="page-header">📋 Count Results</h1>
        <p className="text-sm text-gray-500 mb-4">{storeName} — {format(new Date(countDate), 'MMM d, yyyy')}</p>

        {hasAnomalies && (
          <div className="card bg-red-50 border-red-200 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="text-sm font-bold text-red-700">Anomalies Detected</div>
                <div className="text-xs text-red-600">Some counts don&apos;t match expected values. Check alerts.</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {results.map((r, i) => {
            const product = products.find((p) => p.id === r.productId);
            return (
              <div key={r.productId} className={`card ${r.hasAnomaly ? 'border-red-200' : ''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-medium">
                      {product?.name} {product?.variant && `(${product.variant})`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.boxesSold > 0 ? `${r.boxesSold} sold` : 'None sold'}
                      {r.hasAnomaly && <span className="text-red-500 ml-2">⚠️ Anomaly</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">${r.amountOwed.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400">owed</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card bg-brand-50 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total Owed This Count</span>
            <span className="text-xl font-bold text-brand-700">${totalOwed.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push(`/stores/${storeId}`)} className="btn-secondary flex-1">
            ← Back to Store
          </button>
          <button onClick={() => router.push(`/stores/${storeId}/payment`)} className="btn-primary flex-1">
            💰 Record Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="page-header mb-0">📋 Friday Count</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">{storeName}</p>

      {/* Date picker */}
      <div className="mb-4">
        <label className="label">Count Date</label>
        <input
          type="date"
          className="input"
          value={countDate}
          onChange={(e) => setCountDate(e.target.value)}
        />
      </div>

      {/* Product counts */}
      {products.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          No products have been delivered to this store yet.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm font-bold">
                    {product.name} {product.variant && `(${product.variant})`}
                  </div>
                  <div className="text-xs text-gray-400">
                    Last count: {product.lastRemaining !== null ? `${product.lastRemaining} remaining` : 'Never counted'}
                    {product.deliveredSince > 0 && ` · +${product.deliveredSince} delivered since`}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Boxes Remaining</label>
                <input
                  type="number"
                  className="input text-center text-lg font-bold"
                  placeholder="0"
                  min={0}
                  value={counts[product.id] ?? ''}
                  onChange={(e) => setCounts({ ...counts, [product.id]: e.target.value })}
                  inputMode="numeric"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary w-full mt-6"
        >
          {submitting ? 'Submitting...' : 'Submit Count'}
        </button>
      )}
    </div>
  );
}
