export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getStoreBalance } from '@/actions/stores';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';

export default async function BalancesDashboard() {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      storePayments: {
        orderBy: { paymentDate: 'desc' },
        take: 1,
      },
    },
  });

  const storeData = await Promise.all(
    stores.map(async (store) => {
      const balance = await getStoreBalance(store.id);
      const lastPayment = store.storePayments[0];
      const daysSincePayment = lastPayment
        ? differenceInDays(new Date(), new Date(lastPayment.paymentDate))
        : null;

      return {
        ...store,
        ...balance,
        lastPaymentDate: lastPayment ? new Date(lastPayment.paymentDate) : null,
        daysSincePayment,
        isOverdue: daysSincePayment !== null && daysSincePayment > 14 && balance.balance > 0,
      };
    })
  );

  // Sort by balance descending
  storeData.sort((a, b) => b.balance - a.balance);

  const totalBalance = storeData.reduce((sum, s) => sum + s.balance, 0);
  const totalOwed = storeData.reduce((sum, s) => sum + s.totalOwed, 0);
  const totalPaid = storeData.reduce((sum, s) => sum + s.totalPaid, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">💰 Outstanding Balances</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4 mt-3">
        <div className="card text-center">
          <div className="text-lg font-bold text-gray-900">${totalOwed.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500">Total Owed</div>
        </div>
        <div className="card text-center">
          <div className="text-lg font-bold text-green-600">${totalPaid.toFixed(2)}</div>
          <div className="text-[10px] text-gray-500">Total Paid</div>
        </div>
        <div className="card text-center">
          <div className={`text-lg font-bold ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${totalBalance.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500">Balance</div>
        </div>
      </div>

      {/* Per-store */}
      <div className="space-y-3">
        {storeData.map((store) => (
          <Link key={store.id} href={`/stores/${store.id}`} className="block">
            <div className={`card hover:border-brand-300 transition ${store.isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-sm">{store.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Last payment:{' '}
                    {store.lastPaymentDate
                      ? `${format(store.lastPaymentDate, 'MMM d')} (${store.daysSincePayment}d ago)`
                      : 'Never'}
                  </div>
                  {store.isOverdue && (
                    <span className="inline-flex items-center rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 mt-1">
                      ⚠️ Overdue
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${store.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${store.balance.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    ${store.totalPaid.toFixed(2)} of ${store.totalOwed.toFixed(2)} paid
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {store.totalOwed > 0 && (
                <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min(100, (store.totalPaid / store.totalOwed) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

