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

export async function updateLocation(locationId: string, formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const parentId = (formData.get('parentId') as string) || null;

  if (!name?.trim()) throw new Error('Location name is required');

  await prisma.location.update({
    where: { id: locationId },
    data: {
      name: name.trim(),
      parentId: parentId || null,
    },
  });

  revalidatePath('/locations');
  return { success: true };
}

export async function deactivateLocation(locationId: string) {
  await requireManager();
  await prisma.location.update({
    where: { id: locationId },
    data: { isActive: false },
  });
  revalidatePath('/locations');
  return { success: true };
}

export async function reactivateLocation(locationId: string) {
  await requireManager();
  await prisma.location.update({
    where: { id: locationId },
    data: { isActive: true },
  });
  revalidatePath('/locations');
  return { success: true };
}

export async function createStore(formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const contactName = formData.get('contactName') as string | null;
  const contactPhone = formData.get('contactPhone') as string | null;
  const address = formData.get('address') as string | null;

  if (!name) throw new Error('Store name is required');

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

export async function updateStore(storeId: string, formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const contactName = formData.get('contactName') as string | null;
  const contactPhone = formData.get('contactPhone') as string | null;
  const address = formData.get('address') as string | null;

  if (!name?.trim()) throw new Error('Store name is required');

  await prisma.store.update({
    where: { id: storeId },
    data: {
      name: name.trim(),
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      address: address?.trim() || null,
    },
  });

  revalidatePath('/stores');
  revalidatePath(`/stores/${storeId}`);
  return { success: true };
}

export async function deactivateStore(storeId: string) {
  await requireManager();

  // Deactivate store and its linked location
  await prisma.$transaction([
    prisma.store.update({ where: { id: storeId }, data: { isActive: false } }),
    prisma.location.updateMany({ where: { storeId }, data: { isActive: false } }),
  ]);

  revalidatePath('/stores');
  revalidatePath('/locations');
  return { success: true };
}

export async function reactivateStore(storeId: string) {
  await requireManager();

  await prisma.$transaction([
    prisma.store.update({ where: { id: storeId }, data: { isActive: true } }),
    prisma.location.updateMany({ where: { storeId }, data: { isActive: true } }),
  ]);

  revalidatePath('/stores');
  revalidatePath('/locations');
  return { success: true };
}
