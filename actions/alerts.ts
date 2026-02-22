'use server';

import { prisma } from '@/lib/db';
import { requireManager } from '@/lib/auth';
import { AlertStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function updateAlertStatus(alertId: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') {
  const user = await requireManager();

  const updateData: any = { status: newStatus as AlertStatus };

  if (newStatus === 'ACKNOWLEDGED') {
    updateData.acknowledgedBy = user.userId;
  } else if (newStatus === 'RESOLVED') {
    updateData.resolvedBy = user.userId;
    updateData.resolvedAt = new Date();
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: updateData,
  });

  revalidatePath('/dashboard/alerts');
  return { success: true };
}
