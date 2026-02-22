'use server';

import { prisma } from '@/lib/db';
import { requireManager } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createVendor(formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const contactName = formData.get('contactName') as string | null;
  const contactPhone = formData.get('contactPhone') as string | null;
  const contactEmail = formData.get('contactEmail') as string | null;
  const notes = formData.get('notes') as string | null;

  if (!name?.trim()) throw new Error('Vendor name is required');

  const vendor = await prisma.vendor.create({
    data: {
      name: name.trim(),
      contactName: contactName?.trim() || undefined,
      contactPhone: contactPhone?.trim() || undefined,
      contactEmail: contactEmail?.trim() || undefined,
      notes: notes?.trim() || undefined,
    },
  });

  revalidatePath('/vendors');
  return { success: true, vendorId: vendor.id };
}

export async function updateVendor(vendorId: string, formData: FormData) {
  await requireManager();

  const name = formData.get('name') as string;
  const contactName = formData.get('contactName') as string | null;
  const contactPhone = formData.get('contactPhone') as string | null;
  const contactEmail = formData.get('contactEmail') as string | null;
  const notes = formData.get('notes') as string | null;

  if (!name?.trim()) throw new Error('Vendor name is required');

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      name: name.trim(),
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath('/vendors');
  revalidatePath(`/vendors/${vendorId}`);
  return { success: true };
}

export async function deactivateVendor(vendorId: string) {
  await requireManager();
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { isActive: false },
  });
  revalidatePath('/vendors');
  return { success: true };
}

export async function reactivateVendor(vendorId: string) {
  await requireManager();
  await prisma.vendor.update({
    where: { id: vendorId },
    data: { isActive: true },
  });
  revalidatePath('/vendors');
  return { success: true };
}
