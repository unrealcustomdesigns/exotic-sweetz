export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';

export default async function VendorsPage() {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const vendors = await prisma.vendor.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { movements: true } },
    },
  });

  const active = vendors.filter((v) => v.isActive);
  const inactive = vendors.filter((v) => !v.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-gray-400 hover:text-gray-600">←</Link>
          <h1 className="page-header mb-0">🏭 Vendors</h1>
        </div>
        {isManager && (
          <Link href="/vendors/new" className="btn-primary text-sm">
            + Add Vendor
          </Link>
        )}
      </div>

      {active.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          No vendors yet. Add your first vendor to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendors/${vendor.id}`}
              className="action-card"
            >
              <span className="action-icon">🏭</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800">{vendor.name}</div>
                <div className="text-[11px] text-gray-400">
                  {vendor.contactName && `${vendor.contactName} · `}
                  {vendor._count.movements} movement{vendor._count.movements !== 1 ? 's' : ''}
                </div>
              </div>
              {vendor.contactPhone && (
                <span className="text-xs text-gray-400 flex-shrink-0">{vendor.contactPhone}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <>
          <h2 className="section-header mt-6">Inactive</h2>
          <div className="space-y-2">
            {inactive.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="action-card opacity-50"
              >
                <span className="action-icon">🏭</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{vendor.name}</div>
                  <div className="text-[11px] text-gray-400">Deactivated</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
