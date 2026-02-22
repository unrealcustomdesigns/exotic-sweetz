import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getStoreBalance } from '@/actions/stores';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { StoreEditForm } from './StoreEditForm';
import { StoreStatusButton } from './StoreStatusButton';

export default async function StoreDetailPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await prisma.store.findUnique({
    where: { id: params.storeId },
  });

  if (!store) notFound();

  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const balance = await getStoreBalance(store.id);

  // Recent counts (last 10)
  const recentCounts = await prisma.storeCount.findMany({
    where: { storeId: store.id },
    orderBy: { countDate: 'desc' },
    take: 10,
    include: { product: true },
  });

  // Recent payments (last 10)
  const recentPayments = await prisma.storePayment.findMany({
    where: { storeId: store.id },
    orderBy: { paymentDate: 'desc' },
    take: 10,
  });

  // Recent deliveries
  const recentDeliveries = await prisma.movement.findMany({
    where: {
      storeId: store.id,
      action: 'DELIVER_TO_STORE',
      reversedById: null,
      isReversal: false,
    },
    orderBy: { performedAt: 'desc' },
    take: 10,
    include: { product: true },
  });

  // Current inventory at this store (from ledger)
  const storeLocation = await prisma.location.findFirst({
    where: { storeId: store.id, locationType: 'STORE' },
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/stores" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">{store.name}</h1>
      </div>
      {store.contactName && (
        <p className="text-sm text-gray-500 mb-4">{store.contactName} · {store.contactPhone}</p>
      )}

      {/* Balance card */}
      <div className="card mb-4 bg-gradient-to-r from-brand-50 to-orange-50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Total Owed</div>
            <div className="text-lg font-bold text-gray-900">${balance.totalOwed.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total Paid</div>
            <div className="text-lg font-bold text-green-600">${balance.totalPaid.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Balance</div>
            <div className={`text-lg font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${balance.balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href={`/stores/${store.id}/count`} className="btn-primary text-center text-sm">
          📋 Friday Count
        </Link>
        <Link href={`/stores/${store.id}/payment`} className="btn-secondary text-center text-sm">
          💰 Record Payment
        </Link>
      </div>

      {/* Recent Deliveries */}
      <Section title="Recent Deliveries">
        {recentDeliveries.length === 0 ? (
          <EmptyState text="No deliveries yet" />
        ) : (
          <div className="space-y-2">
            {recentDeliveries.map((d) => (
              <div key={d.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <div className="text-sm font-medium">{d.product.name} {d.product.variant && `(${d.product.variant})`}</div>
                  <div className="text-xs text-gray-400">{format(new Date(d.performedAt), 'MMM d, h:mm a')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{d.quantity} box{d.quantity !== 1 ? 'es' : ''}</div>
                  {d.priceSnapshot && (
                    <div className="text-xs text-gray-400">${Number(d.priceSnapshot).toFixed(2)}/box</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Counts */}
      <Section title="Recent Counts">
        {recentCounts.length === 0 ? (
          <EmptyState text="No counts yet. Do a Friday count!" />
        ) : (
          <div className="space-y-2">
            {recentCounts.map((c) => (
              <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <div className="text-sm font-medium">{c.product.name} {c.product.variant && `(${c.product.variant})`}</div>
                  <div className="text-xs text-gray-400">{format(new Date(c.countDate), 'MMM d, yyyy')}</div>
                </div>
                <div className="text-sm font-bold">{c.boxesRemaining} remaining</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Payments */}
      <Section title="Recent Payments">
        {recentPayments.length === 0 ? (
          <EmptyState text="No payments recorded" />
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <div className="text-sm font-medium">${Number(p.amount).toFixed(2)}</div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(p.paymentDate), 'MMM d, yyyy')}
                    {p.paymentMethod && ` · ${p.paymentMethod}`}
                  </div>
                </div>
                {p.notes && <div className="text-xs text-gray-400 max-w-[120px] truncate">{p.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Section>
      {/* Manager: Edit & Deactivate */}
      {isManager && (
        <>
          <StoreEditForm store={{
            id: store.id,
            name: store.name,
            contactName: store.contactName,
            contactPhone: store.contactPhone,
            address: store.address,
          }} />
          <StoreStatusButton
            storeId={store.id}
            storeName={store.name}
            isActive={store.isActive}
          />
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h2>
      <div className="card">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-4">{text}</p>;
}
