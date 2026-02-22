export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { VendorForm } from '../VendorForm';
import { VendorStatusButton } from './VendorStatusButton';

export default async function VendorDetailPage({
  params,
}: {
  params: { vendorId: string };
}) {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const vendor = await prisma.vendor.findUnique({
    where: { id: params.vendorId },
  });

  if (!vendor) notFound();

  const recentMovements = await prisma.movement.findMany({
    where: { vendorId: vendor.id, isReversal: false, reversedById: null },
    orderBy: { performedAt: 'desc' },
    take: 10,
    include: { product: true, toLocation: true },
  });

  // Total boxes received from this vendor
  const totalReceived = await prisma.movement.aggregate({
    where: { vendorId: vendor.id, action: 'RECEIVE', isReversal: false, reversedById: null },
    _sum: { quantity: true },
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/vendors" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">
          🏭 {vendor.name}
          {!vendor.isActive && (
            <span className="text-sm font-normal text-red-400 ml-2">INACTIVE</span>
          )}
        </h1>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Added {format(new Date(vendor.createdAt), 'MMM d, yyyy')}
        {' · '}{totalReceived._sum.quantity || 0} boxes received total
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <div className="text-2xl font-bold text-brand-500">{totalReceived._sum.quantity || 0}</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">Boxes Received</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-candy-purple">{recentMovements.length}</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">Recent Receipts</div>
        </div>
      </div>

      {/* Edit form (Manager only) */}
      {isManager && (
        <div className="mb-4">
          <h2 className="section-header">Edit Details</h2>
          <div className="card">
            <VendorForm vendor={{
              id: vendor.id,
              name: vendor.name,
              contactName: vendor.contactName,
              contactPhone: vendor.contactPhone,
              contactEmail: vendor.contactEmail,
              notes: vendor.notes,
            }} />
          </div>
        </div>
      )}

      {/* Contact info (non-managers) */}
      {!isManager && (vendor.contactName || vendor.contactPhone || vendor.contactEmail) && (
        <div className="card mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Contact</h2>
          <div className="space-y-1 text-sm">
            {vendor.contactName && <div>{vendor.contactName}</div>}
            {vendor.contactPhone && (
              <a href={`tel:${vendor.contactPhone}`} className="text-brand-500 block">
                {vendor.contactPhone}
              </a>
            )}
            {vendor.contactEmail && (
              <a href={`mailto:${vendor.contactEmail}`} className="text-brand-500 block">
                {vendor.contactEmail}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Recent movements */}
      <div className="mb-4">
        <h2 className="section-header">Recent Receipts</h2>
        {recentMovements.length === 0 ? (
          <div className="card text-center py-4 text-gray-400 text-sm">No receipts yet</div>
        ) : (
          <div className="card">
            <div className="space-y-2">
              {recentMovements.map((mov) => (
                <div key={mov.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium">
                      {mov.product.name}
                      {mov.product.variant && ` (${mov.product.variant})`}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      → {mov.toLocation?.name} · {format(new Date(mov.performedAt), 'MMM d')}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold">{mov.quantity} BOX</div>
                    {mov.priceSnapshot && (
                      <div className="text-[10px] text-green-600">
                        ${Number(mov.priceSnapshot).toFixed(2)}/box
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deactivate/Reactivate */}
      {isManager && (
        <VendorStatusButton
          vendorId={vendor.id}
          vendorName={vendor.name}
          isActive={vendor.isActive}
        />
      )}
    </div>
  );
}
