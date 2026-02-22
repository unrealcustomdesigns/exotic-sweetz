'use client';

import { useRouter } from 'next/navigation';
import { updateAlertStatus } from '@/actions/alerts';
import { toast } from 'sonner';

export function AlertActions({ alertId, currentStatus }: { alertId: string; currentStatus: string }) {
  const router = useRouter();

  const handleAction = async (newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await updateAlertStatus(alertId, newStatus);
      toast.success(`Alert ${newStatus.toLowerCase()}`);
      router.refresh();
    } catch (err: any) {
      toast.error('Failed', { description: err.message });
    }
  };

  return (
    <div className="flex gap-2">
      {currentStatus === 'OPEN' && (
        <button onClick={() => handleAction('ACKNOWLEDGED')} className="btn-ghost text-xs flex-1">
          Acknowledge
        </button>
      )}
      <button onClick={() => handleAction('RESOLVED')} className="btn-primary text-xs flex-1">
        Resolve
      </button>
    </div>
  );
}
