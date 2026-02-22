import { prisma } from '@/lib/db';
import { getStoreBalance } from '@/actions/stores';
import { getInventoryByLocationType } from '@/lib/inventory';
import Link from 'next/link';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Active stores
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Weekly data per store
  const storeRows = await Promise.all(
    stores.map(async (store) => {
      // Deliveries this week
      const deliveries = await prisma.movement.aggregate({
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
      const payments = await prisma.storePayment.aggregate({
        where: {
          storeId: store.id,
          paymentDate: { gte: weekStart, lte: weekEnd },
        },
        _sum: { amount: true },
      });

      // Count this week
      const countThisWeek = await prisma.storeCount.findFirst({
        where: {
          storeId: store.id,
          countDate: { gte: weekStart, lte: weekEnd },
        },
      });

      // Overall balance
      const balance = await getStoreBalance(store.id);

      return {
        name: store.name,
        storeId: store.id,
        totalOut: deliveries._sum.quantity ?? 0,
        amountCollected: Number(payments._sum.amount ?? 0),
        balance: balance.balance,
        counted: !!countThisWeek,
        restocked: (deliveries._sum.quantity ?? 0) > 0,
      };
    })
  );

  // Quick stats
  const totalBalance = storeRows.reduce((sum, s) => sum + s.balance, 0);
  const totalCollected = storeRows.reduce((sum, s) => sum + s.amountCollected, 0);
  const openAlerts = await prisma.alert.count({ where: { status: 'OPEN' } });

  // Inventory summary
  const inventorySummary = await getInventoryByLocationType();
  const totalBoxesInStorage = inventorySummary
    .filter((r) => r.unit_type === 'BOX' && r.location_type === 'STORAGE')
    .reduce((sum, r) => sum + Number(r.total_on_hand), 0);

  return (
    <div>
      <h1 className="page-header">📊 Weekly Dashboard</h1>
      <p className="text-sm text-gray-500 -mt-3 mb-4">
        {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
      </p>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-600">${totalBalance.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Total Outstanding</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">${totalCollected.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Collected This Week</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{totalBoxesInStorage}</div>
          <div className="text-xs text-gray-500">Boxes in Storage</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold ${openAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {openAlerts}
          </div>
          <div className="text-xs text-gray-500">Open Alerts</div>
        </div>
      </div>

      {/* Store summary table */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Store Summary
      </h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 text-xs font-medium text-gray-500">Store</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Out</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Collected</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Balance</th>
              <th className="text-center py-2 text-xs font-medium text-gray-500">Counted</th>
            </tr>
          </thead>
          <tbody>
            {storeRows.map((row) => (
              <tr key={row.storeId} className="border-b border-gray-50">
                <td className="py-2">
                  <Link href={`/stores/${row.storeId}`} className="text-brand-600 hover:underline font-medium">
                    {row.name}
                  </Link>
                </td>
                <td className="text-right py-2 font-medium">{row.totalOut}</td>
                <td className="text-right py-2 text-green-600">${row.amountCollected.toFixed(2)}</td>
                <td className={`text-right py-2 font-bold ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${row.balance.toFixed(2)}
                </td>
                <td className="text-center py-2">
                  {row.counted ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Link href="/dashboard/inventory" className="card text-center hover:border-brand-300 transition py-3">
          <div className="text-lg">📦</div>
          <div className="text-xs font-medium text-gray-600">Full Inventory</div>
        </Link>
        <Link href="/dashboard/balances" className="card text-center hover:border-brand-300 transition py-3">
          <div className="text-lg">💰</div>
          <div className="text-xs font-medium text-gray-600">All Balances</div>
        </Link>
        <Link href="/dashboard/alerts" className="card text-center hover:border-brand-300 transition py-3">
          <div className="text-lg">🔔</div>
          <div className="text-xs font-medium text-gray-600">Alerts</div>
        </Link>
        <Link href="/dashboard/shrinkage" className="card text-center hover:border-brand-300 transition py-3">
          <div className="text-lg">🔍</div>
          <div className="text-xs font-medium text-gray-600">Shrinkage</div>
        </Link>
      </div>
    </div>
  );
}
