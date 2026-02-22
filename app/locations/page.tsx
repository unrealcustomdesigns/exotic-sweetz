import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CreateLocationForm } from './CreateLocationForm';

export default async function LocationsPage() {
  const user = await getAuthUser();
  if (user.role !== 'MANAGER') redirect('/');

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: [{ locationType: 'asc' }, { name: 'asc' }],
    include: {
      store: true,
      parent: true,
    },
  });

  // Group by type
  const grouped = {
    STORAGE: locations.filter((l) => l.locationType === 'STORAGE'),
    SHELF: locations.filter((l) => l.locationType === 'SHELF'),
    TRUCK: locations.filter((l) => l.locationType === 'TRUCK'),
    STORE: locations.filter((l) => l.locationType === 'STORE'),
  };

  const typeLabels: Record<string, string> = {
    STORAGE: '📦 Storage',
    SHELF: '📥 Shelves',
    TRUCK: '🚚 Trucks',
    STORE: '🏪 Store Locations',
  };

  return (
    <div>
      <h1 className="page-header">📍 Locations</h1>

      {Object.entries(grouped).map(([type, locs]) => (
        <div key={type} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {typeLabels[type]} ({locs.length})
          </h2>
          {locs.length === 0 ? (
            <div className="card text-center py-3 text-gray-400 text-sm">None</div>
          ) : (
            <div className="space-y-2">
              {locs.map((loc) => (
                <div key={loc.id} className="card">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{loc.name}</div>
                      {loc.parent && (
                        <div className="text-xs text-gray-400">Inside: {loc.parent.name}</div>
                      )}
                      {loc.store && (
                        <div className="text-xs text-gray-400">Store: {loc.store.name}</div>
                      )}
                    </div>
                    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {loc.locationType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Create new location */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Add Location
        </h2>
        <div className="card">
          <CreateLocationForm
            storageLocations={grouped.STORAGE}
          />
        </div>
      </div>
    </div>
  );
}
