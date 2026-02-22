export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CreateLocationForm } from './CreateLocationForm';
import { LocationCard } from './LocationCard';

export default async function LocationsPage() {
  const user = await getAuthUser();
  if (user.role !== 'MANAGER') redirect('/');

  const locations = await prisma.location.findMany({
    orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
    include: {
      store: true,
      parent: true,
    },
  });

  const active = locations.filter((l) => l.isActive);
  const inactive = locations.filter((l) => !l.isActive);

  const grouped = {
    STORAGE: active.filter((l) => l.locationType === 'STORAGE'),
    SHELF: active.filter((l) => l.locationType === 'SHELF'),
    TRUCK: active.filter((l) => l.locationType === 'TRUCK'),
    STORE: active.filter((l) => l.locationType === 'STORE'),
  };

  const typeConfig: Record<string, { label: string; icon: string }> = {
    STORAGE: { label: 'Storage', icon: '📦' },
    SHELF: { label: 'Shelves', icon: '📥' },
    TRUCK: { label: 'Trucks', icon: '🚚' },
    STORE: { label: 'Store Locations', icon: '🏪' },
  };

  const storageLocations = grouped.STORAGE.map((l) => ({ id: l.id, name: l.name }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">📍 Locations</h1>
      </div>

      {Object.entries(grouped).map(([type, locs]) => (
        <div key={type} className="mb-6">
          <div className="section-header">
            {typeConfig[type].icon} {typeConfig[type].label} ({locs.length})
          </div>
          {locs.length === 0 ? (
            <div className="card text-center py-3 text-gray-400 text-sm">None</div>
          ) : (
            <div className="space-y-2">
              {locs.map((loc) => (
                <LocationCard
                  key={loc.id}
                  location={{
                    id: loc.id,
                    name: loc.name,
                    locationType: loc.locationType,
                    isActive: loc.isActive,
                    parentName: loc.parent?.name || null,
                    storeName: loc.store?.name || null,
                    storeId: loc.storeId,
                  }}
                  storageLocations={storageLocations}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div className="mb-6">
          <div className="section-header">🚫 Inactive ({inactive.length})</div>
          <div className="space-y-2">
            {inactive.map((loc) => (
              <LocationCard
                key={loc.id}
                location={{
                  id: loc.id,
                  name: loc.name,
                  locationType: loc.locationType,
                  isActive: loc.isActive,
                  parentName: loc.parent?.name || null,
                  storeName: loc.store?.name || null,
                  storeId: loc.storeId,
                }}
                storageLocations={storageLocations}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create new */}
      <div className="mt-6">
        <div className="section-header">➕ Add Location</div>
        <div className="card">
          <CreateLocationForm storageLocations={storageLocations} />
        </div>
      </div>
    </div>
  );
}
