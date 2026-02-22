'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateLocation, deactivateLocation, reactivateLocation } from '@/actions/locations';
import { toast } from 'sonner';

type LocationData = {
  id: string;
  name: string;
  locationType: string;
  isActive: boolean;
  parentName: string | null;
  storeName: string | null;
  storeId: string | null;
};

export function LocationCard({
  location,
  storageLocations,
}: {
  location: LocationData;
  storageLocations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const isStoreLocation = location.locationType === 'STORE';

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    try {
      const formData = new FormData(form);
      await updateLocation(location.id, formData);
      toast.success('Location updated!');
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      if (location.isActive) {
        await deactivateLocation(location.id);
        toast.success(`${location.name} deactivated`);
      } else {
        await reactivateLocation(location.id);
        toast.success(`${location.name} reactivated`);
      }
      setConfirming(false);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const typeColors: Record<string, string> = {
    STORAGE: 'bg-orange-100 text-orange-700',
    SHELF: 'bg-purple-100 text-purple-700',
    TRUCK: 'bg-cyan-100 text-cyan-700',
    STORE: 'bg-emerald-100 text-emerald-700',
  };

  // Confirm deactivate
  if (confirming) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-sm font-bold text-red-700 mb-1">
          {location.isActive ? 'Deactivate' : 'Reactivate'} &quot;{location.name}&quot;?
        </p>
        <p className="text-xs text-red-600 mb-3">
          {location.isActive
            ? 'It will be hidden from all forms. Existing movements are kept.'
            : 'It will appear in forms again.'}
        </p>
        <div className="flex gap-2">
          <button onClick={handleToggleActive} disabled={loading} className={location.isActive ? 'btn-danger flex-1 text-xs' : 'btn-primary flex-1 text-xs'}>
            {loading ? '...' : 'Yes'}
          </button>
          <button onClick={() => setConfirming(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
        </div>
      </div>
    );
  }

  // Edit mode
  if (editing) {
    return (
      <div className="card border-brand-200">
        <form onSubmit={handleSave} className="space-y-2">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required defaultValue={location.name} />
          </div>
          {location.locationType === 'SHELF' && storageLocations.length > 0 && (
            <div>
              <label className="label">Parent Storage</label>
              <select name="parentId" className="input">
                <option value="">None</option>
                {storageLocations.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-xs">
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1 text-xs">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // View mode
  return (
    <div className={`card ${!location.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-gray-800">{location.name}</div>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${typeColors[location.locationType] || 'bg-gray-100 text-gray-600'}`}>
              {location.locationType}
            </span>
          </div>
          {location.parentName && (
            <div className="text-xs text-gray-400">Inside: {location.parentName}</div>
          )}
          {location.storeName && (
            <div className="text-xs text-gray-400">Store: {location.storeName}</div>
          )}
          {!location.isActive && (
            <div className="text-xs text-red-400 font-bold">INACTIVE</div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isStoreLocation && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-600 transition-colors"
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => setConfirming(true)}
            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            {location.isActive ? '🗑️' : '♻️'}
          </button>
        </div>
      </div>
    </div>
  );
}
