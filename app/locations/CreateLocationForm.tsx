'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLocation } from '@/actions/locations';
import { toast } from 'sonner';

type Props = {
  storageLocations: { id: string; name: string }[];
};

export function CreateLocationForm({ storageLocations }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [locationType, setLocationType] = useState('STORAGE');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      await createLocation(formData);
      toast.success('Location created!');
      router.refresh();
      e.currentTarget.reset();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Name</label>
        <input name="name" className="input" placeholder="e.g. Shelf C-1, Delivery Van" required />
      </div>
      <div>
        <label className="label">Type</label>
        <select
          name="locationType"
          className="input"
          value={locationType}
          onChange={(e) => setLocationType(e.target.value)}
        >
          <option value="STORAGE">Storage</option>
          <option value="SHELF">Shelf</option>
          <option value="TRUCK">Truck</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Store locations are created automatically when you add a store.
        </p>
      </div>

      {locationType === 'SHELF' && storageLocations.length > 0 && (
        <div>
          <label className="label">Parent Storage (optional)</label>
          <select name="parentId" className="input">
            <option value="">None</option>
            {storageLocations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating...' : 'Create Location'}
      </button>
    </form>
  );
}
