export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';
import { format } from 'date-fns';
import { AlertActions } from './AlertActions';

export default async function AlertsDashboard() {
  const user = await getAuthUser();
  const isManager = user.role === 'MANAGER';

  const alerts = await prisma.alert.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      product: true,
      store: true,
      location: true,
    },
  });

  const openAlerts = alerts.filter((a) => a.status === 'OPEN');
  const acknowledgedAlerts = alerts.filter((a) => a.status === 'ACKNOWLEDGED');
  const resolvedAlerts = alerts.filter((a) => a.status === 'RESOLVED');

  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    WARNING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const typeIcons: Record<string, string> = {
    NEGATIVE_INVENTORY: '📉',
    SHRINKAGE_DETECTED: '🔍',
    RECONCILIATION_MISMATCH: '⚠️',
    LOW_STOCK: '📦',
    PAYMENT_OVERDUE: '💳',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="page-header mb-0">🔔 Alerts</h1>
        {openAlerts.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {openAlerts.length} open
          </span>
        )}
      </div>

      {/* Open alerts */}
      {openAlerts.length > 0 && (
        <AlertSection title="Open" alerts={openAlerts} severityColors={severityColors} typeIcons={typeIcons} isManager={isManager} />
      )}

      {/* Acknowledged */}
      {acknowledgedAlerts.length > 0 && (
        <AlertSection title="Acknowledged" alerts={acknowledgedAlerts} severityColors={severityColors} typeIcons={typeIcons} isManager={isManager} />
      )}

      {/* Resolved */}
      {resolvedAlerts.length > 0 && (
        <AlertSection title="Resolved" alerts={resolvedAlerts} severityColors={severityColors} typeIcons={typeIcons} isManager={isManager} collapsed />
      )}

      {alerts.length === 0 && (
        <div className="card text-center py-8">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-gray-500">No alerts. Everything looks good!</div>
        </div>
      )}
    </div>
  );
}

function AlertSection({
  title,
  alerts,
  severityColors,
  typeIcons,
  isManager,
  collapsed,
}: {
  title: string;
  alerts: any[];
  severityColors: Record<string, string>;
  typeIcons: Record<string, string>;
  isManager: boolean;
  collapsed?: boolean;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title} ({alerts.length})
      </h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`card border ${
              alert.status === 'RESOLVED' ? 'opacity-60' : ''
            } ${alert.severity === 'CRITICAL' && alert.status === 'OPEN' ? 'border-red-200' : ''}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{typeIcons[alert.alertType] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${severityColors[alert.severity]}`}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(alert.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <div className="text-sm font-medium mt-1">{alert.title}</div>
                {alert.description && (
                  <div className="text-xs text-gray-500 mt-0.5">{alert.description}</div>
                )}
                <div className="flex gap-2 mt-1">
                  {alert.product && (
                    <span className="text-[10px] text-gray-400">Product: {alert.product.name}</span>
                  )}
                  {alert.store && (
                    <span className="text-[10px] text-gray-400">Store: {alert.store.name}</span>
                  )}
                </div>
              </div>
            </div>

            {isManager && alert.status !== 'RESOLVED' && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <AlertActions alertId={alert.id} currentStatus={alert.status} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

