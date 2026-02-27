export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getStoreBalance } from '@/actions/stores';
import { notFound, redirect } from 'next/navigation';
import { format, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

export default async function ViewerDashboard({
  params,
}: {
  params: { storeId: string };
}) {
  const user = await getAuthUser();

  // Ensure viewer can only see their assigned store
  if (user.role === 'VIEWER' && user.storeId !== params.storeId) {
    redirect(user.storeId ? `/viewer/${user.storeId}` : '/viewer/no-store');
  }

  const store = await prisma.store.findUnique({
    where: { id: params.storeId },
  });

  if (!store) notFound();

  const balance = await getStoreBalance(store.id);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Deliveries this week
  const weeklyDeliveries = await prisma.movement.aggregate({
    where: {
      storeId: store.id,
      action: 'DELIVER_TO_STORE',
      unitType: 'BOX',
      performedAt: { gte: weekStart, lte: weekEnd },
      reversedById: null,
      isReversal: false,
    },
    _sum: { quantity: true },
  });

  // Payments this week
  const weeklyPayments = await prisma.storePayment.aggregate({
    where: {
      storeId: store.id,
      paymentDate: { gte: weekStart, lte: weekEnd },
    },
    _sum: { amount: true },
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
    take: 15,
    include: { product: true },
  });

  // Recent counts
  const recentCounts = await prisma.storeCount.findMany({
    where: { storeId: store.id },
    orderBy: { countDate: 'desc' },
    take: 15,
    include: { product: true },
  });

  // Recent payments
  const recentPayments = await prisma.storePayment.findMany({
    where: { storeId: store.id },
    orderBy: { paymentDate: 'desc' },
    take: 15,
  });

  // Last payment info
  const lastPayment = recentPayments[0];
  const daysSincePayment = lastPayment
    ? differenceInDays(now, new Date(lastPayment.paymentDate))
    : null;

  return (
    <div>
      {/* Header */}
      <div className="hero-banner animate-slide-up">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white">🏪 {store.name}</h1>
          <p className="text-sm text-white/80 font-medium mt-0.5">
            Welcome, {user.name} 👋
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div className="card mb-4 bg-gradient-to-r from-brand-50 to-orange-50 border-brand-200">
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
            <div className="text-xs text-gray-500">Balance Due</div>
            <div className={`text-lg font-bold ${balance.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${balance.balance.toFixed(2)}
            </div>
          </div>
        </div>
        {balance.balance > 0 && daysSincePayment !== null && daysSincePayment > 14 && (
          <div className="mt-2 text-center">
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
              ⚠️ Payment overdue — {daysSincePayment} days since last payment
            </span>
          </div>
        )}
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card">
          <div className="text-2xl font-bold text-brand-500">
            {weeklyDeliveries._sum.quantity ?? 0}
          </div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">Boxes This Week</div>
        </div>
        <div className="stat-card">
          <div className="text-2xl font-bold text-green-600">
            ${Number(weeklyPayments._sum.amount ?? 0).toFixed(2)}
          </div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">Paid This Week</div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <Section title="📦 Recent Deliveries">
        {recentDeliveries.length === 0 ? (
          <EmptyState text="No deliveries yet" />
        ) : (
          <div className="space-y-2">
            {recentDeliveries.map((d) => (
              <div key={d.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">
                    {d.product.name}
                    {d.product.variant && ` (${d.product.variant})`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(d.performedAt), 'MMM d, h:mm a')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">
                    {d.quantity} box{d.quantity !== 1 ? 'es' : ''}
                  </div>
                  {d.priceSnapshot && (
                    <div className="text-xs text-gray-400">
                      ${Number(d.priceSnapshot).toFixed(2)}/box
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Counts */}
      <Section title="📋 Recent Counts">
        {recentCounts.length === 0 ? (
          <EmptyState text="No counts recorded yet" />
        ) : (
          <div className="space-y-2">
            {recentCounts.map((c) => (
              <div key={c.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">
                    {c.product.name}
                    {c.product.variant && ` (${c.product.variant})`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(c.countDate), 'MMM d, yyyy')}
                  </div>
                </div>
                <div className="text-sm font-bold">{c.boxesRemaining} remaining</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Recent Payments */}
      <Section title="💰 Payment History">
        {recentPayments.length === 0 ? (
          <EmptyState text="No payments recorded" />
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-green-700">
                    ${Number(p.amount).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(new Date(p.paymentDate), 'MMM d, yyyy')}
                    {p.paymentMethod && ` · ${p.paymentMethod}`}
                  </div>
                </div>
                {p.notes && (
                  <div className="text-xs text-gray-400 max-w-[120px] truncate">{p.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Last payment footer */}
      <div className="text-center text-xs text-gray-400 mt-4 mb-2">
        Last payment:{' '}
        {lastPayment
          ? `${format(new Date(lastPayment.paymentDate), 'MMM d, yyyy')} (${daysSincePayment}d ago)`
          : 'None'}
      </div>
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
