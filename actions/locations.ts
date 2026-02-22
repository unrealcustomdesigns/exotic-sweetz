'use server';

import { prisma } from '@/lib/db';
import { requireManager } from '@/lib/auth';
import { LocationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createLocation(formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const locationType = formData.get('locationType') as LocationType;
  const parentId = (formData.get('parentId') as string) || undefined;

  if (!name || !locationType) throw new Error('Missing required fields');

  const location = await prisma.location.create({
    data: {
      name,
      locationType,
      parentId: parentId || undefined,
    },
  });

  revalidatePath('/locations');
  return { success: true, locationId: location.id };
}

export async function createStore(formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const contactName = formData.get('contactName') as string | null;
  const contactPhone = formData.get('contactPhone') as string | null;
  const address = formData.get('address') as string | null;

  if (!name) throw new Error('Store name is required');

  // Create store + auto-create a STORE location linked to it
  const store = await prisma.store.create({
    data: {
      name,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      address: address || undefined,
      locations: {
        create: {
          name: `Store: ${name}`,
          locationType: 'STORE',
        },
      },
    },
    include: { locations: true },
  });

  revalidatePath('/stores');
  revalidatePath('/locations');
  return { success: true, storeId: store.id };
}
