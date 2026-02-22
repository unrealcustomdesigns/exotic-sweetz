'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { recordPayment, getStoreBalance } from '@/actions/stores';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function StorePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;

  const [storeName, setStoreName] = useState('');
  const [balance, setBalance] = useState<{ totalOwed: number; totalPaid: number; balance: number } | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stores/${storeId}/count-products`);
        const data = await res.json();
        setStoreName(data.storeName);
        const bal = await getStoreBalance(storeId);
        setBalance(bal);
      } catch {
        toast.error('Failed to load store data');
      }
    }
    load();
  }, [storeId]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('storeId', storeId);
      formData.set('amount', amount);
      formData.set('paymentDate', paymentDate);
      formData.set('paymentMethod', paymentMethod);
      formData.set('notes', notes);

      await recordPayment(formData);
      setSuccess(true);
      toast.success('Payment recorded!');
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    const newBalance = (balance?.balance ?? 0) - parseFloat(amount);
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-lg font-bold mb-1">Payment Recorded!</h2>
        <p className="text-sm text-gray-500 mb-2">
          ${parseFloat(amount).toFixed(2)} from {storeName}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          New balance: <span className={`font-bold ${newBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${newBalance.toFixed(2)}
          </span>
        </p>
        <div className="flex gap-3">
          <button onClick={() => router.push(`/stores/${storeId}`)} className="btn-secondary flex-1">
            ← Back to Store
          </button>
          <button onClick={() => router.push('/stores')} className="btn-primary flex-1">
            All Stores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="page-header mb-0">💰 Record Payment</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">{storeName || 'Loading...'}</p>

      {/* Current balance */}
      {balance && (
        <div className="card mb-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Current Balance</span>
            <span className={`text-xl font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${balance.balance.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Amount Collected ($)</label>
          <input
            type="number"
            className="input text-lg font-bold text-center"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
          />
          {balance && parseFloat(amount) > 0 && (
            <p className="text-xs text-gray-400 mt-1 text-center">
              Remaining after: ${(balance.balance - parseFloat(amount)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Quick amount buttons */}
        {balance && balance.balance > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setAmount(balance.balance.toFixed(2))}
              className="btn-ghost text-xs flex-1"
            >
              Pay Full (${balance.balance.toFixed(2)})
            </button>
            <button
              onClick={() => setAmount((balance.balance / 2).toFixed(2))}
              className="btn-ghost text-xs flex-1"
            >
              Pay Half (${(balance.balance / 2).toFixed(2)})
            </button>
          </div>
        )}

        <div>
          <label className="label">Payment Date</label>
          <input
            type="date"
            className="input"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {['Cash', 'Zelle', 'Check'].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`btn text-sm ${
                  paymentMethod === method
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Any notes about this payment..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !amount || parseFloat(amount) <= 0}
        className="btn-primary w-full mt-6"
      >
        {submitting ? 'Recording...' : 'Record Payment'}
      </button>
    </div>
  );
}
