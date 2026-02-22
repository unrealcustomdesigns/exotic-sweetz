import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';
import { ACTION_LABELS } from '@/lib/validation';
import { MovementAction } from '@prisma/client';

const ACTION_ICONS: Record<string, string> = {
  RECEIVE: '📦',
  PUT_ON_SHELF: '📥',
  TAKE_OFF_SHELF: '📤',
  DELIVER_TO_STORE: '🚚',
  RETURN_FROM_STORE: '↩️',
  CONVERT_BOX_TO_PACKS: '🔄',
  SALE_RETAIL_PACK: '💰',
  SALE_RETAIL_BOX: '💰',
  ADJUSTMENT: '⚙️',
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { action?: string; page?: string };
}) {
  const user = await getAuthUser();
  const page = parseInt(searchParams.page || '1', 10);
  const pageSize = 30;
  const actionFilter = searchParams.action as MovementAction | undefined;

  const where: any = {
    isReversal: false,
  };
  if (actionFilter) {
    where.action = actionFilter;
  }

  const [movements, total] = await Promise.all([
    prisma.movement.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        store: true,
        vendor: true,
      },
    }),
    prisma.movement.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">📜 Movement History</h1>
      </div>

      {/* Action filter */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link
          href="/history"
          className={`text-[11px] px-2 py-1 rounded-full ${
            !actionFilter ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          All ({total})
        </Link>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/history?action=${key}`}
            className={`text-[11px] px-2 py-1 rounded-full ${
              actionFilter === key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {ACTION_ICONS[key]} {label.split(' ')[0]}
          </Link>
        ))}
      </div>

      {/* Movement list */}
      {movements.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          No movements recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {movements.map((mov) => {
            const isReversed = !!mov.reversedById;
            return (
              <div
                key={mov.id}
                className={`card ${isReversed ? 'opacity-50 border-dashed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {ACTION_ICONS[mov.action] || '📋'}
                    </span>
                    <div>
                      <div className="text-sm font-medium">
                        {ACTION_LABELS[mov.action]}
                        {isReversed && (
                          <span className="text-red-400 text-xs ml-1.5">REVERSED</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {mov.product.name}
                        {mov.product.variant && ` (${mov.product.variant})`}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {mov.fromLocation && (
                          <span>{mov.fromLocation.name}</span>
                        )}
                        {mov.fromLocation && mov.toLocation && ' → '}
                        {mov.toLocation && (
                          <span>{mov.toLocation.name}</span>
                        )}
                        {mov.store && (
                          <span className="ml-1">· {mov.store.name}</span>
                        )}
                        {mov.vendor && (
                          <span className="ml-1">· from {mov.vendor.name}</span>
                        )}
                      </div>
                      {mov.notes && (
                        <div className="text-[11px] text-gray-400 italic mt-0.5">
                          {mov.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold">
                      {mov.quantity} {mov.unitType}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {format(new Date(mov.performedAt), 'MMM d, h:mm a')}
                    </div>
                    {mov.priceSnapshot && (
                      <div className="text-[10px] text-green-600">
                        ${Number(mov.priceSnapshot).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          {page > 1 ? (
            <Link
              href={`/history?${actionFilter ? `action=${actionFilter}&` : ''}page=${page - 1}`}
              className="btn-ghost text-sm"
            >
              ← Prev
            </Link>
          ) : (
            <div />
          )}
          <span className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/history?${actionFilter ? `action=${actionFilter}&` : ''}page=${page + 1}`}
              className="btn-ghost text-sm"
            >
              Next →
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  );
}
