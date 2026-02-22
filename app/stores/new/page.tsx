'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStore } from '@/actions/locations';
import { toast } from 'sonner';

export default function NewStorePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await createStore(formData);
      toast.success('Store created!');
      router.push(`/stores/${result.storeId}`);
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
        <h1 className="page-header mb-0">🏪 New Store</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card space-y-3">
          <div>
            <label className="label">Store Name *</label>
            <input name="name" className="input" placeholder="e.g. Kwik-E-Mart Downtown" required />
          </div>
          <div>
            <label className="label">Contact Name</label>
            <input name="contactName" className="input" placeholder="Store owner/manager" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="contactPhone" className="input" type="tel" placeholder="555-0123" />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea name="address" className="input" rows={2} placeholder="Store address..." />
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          A store location will be auto-created for inventory tracking.
        </p>

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Creating...' : 'Create Store'}
        </button>
      </form>
    </div>
  );
}
