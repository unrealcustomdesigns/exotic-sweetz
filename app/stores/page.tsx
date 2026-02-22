export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getStoreBalance } from '@/actions/stores';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function StoresPage() {
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Fetch balances for each store
  const storesWithBalances = await Promise.all(
    stores.map(async (store) => {
      const balance = await getStoreBalance(store.id);
      return { ...store, ...balance };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header mb-0">🏪 Stores</h1>
        <Link href="/stores/new" className="btn-primary text-xs">
          + Add Store
        </Link>
      </div>

      {storesWithBalances.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <p>No stores yet. Add your first consignment partner.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {storesWithBalances.map((store) => (
            <Link key={store.id} href={`/stores/${store.id}`} className="block">
              <div className="card hover:border-brand-300 transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{store.name}</div>
                    {store.contactName && (
                      <div className="text-xs text-gray-500">{store.contactName}</div>
                    )}
                    {store.nextCollectionDate && (
                      <div className="text-xs text-gray-400 mt-1">
                        Next collection: {format(new Date(store.nextCollectionDate), 'MMM d')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        store.balance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      ${store.balance.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase">Balance</div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Owed: <span className="font-medium text-gray-700">${store.totalOwed.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Paid: <span className="font-medium text-gray-700">${store.totalPaid.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Total balance summary */}
      {storesWithBalances.length > 0 && (
        <div className="card mt-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Outstanding</span>
            <span className="text-xl font-bold text-red-600">
              ${storesWithBalances.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

