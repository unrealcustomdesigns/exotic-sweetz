'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateStore } from '@/actions/locations';
import { toast } from 'sonner';

type StoreData = {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
};

export function StoreEditForm({ store }: { store: StoreData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    try {
      const formData = new FormData(form);
      await updateStore(store.id, formData);
      toast.success('Store updated!');
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="btn-secondary w-full text-sm">
        ✏️ Edit Store Details
      </button>
    );
  }

  return (
    <div className="card border-brand-200">
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="label">Store Name *</label>
          <input name="name" className="input" required defaultValue={store.name} />
        </div>
        <div>
          <label className="label">Contact Name</label>
          <input name="contactName" className="input" defaultValue={store.contactName || ''} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone</label>
            <input name="contactPhone" className="input" type="tel" defaultValue={store.contactPhone || ''} />
          </div>
          <div>
            <label className="label">Address</label>
            <input name="address" className="input" defaultValue={store.address || ''} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
