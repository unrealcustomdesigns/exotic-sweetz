import { currentUser } from '@clerk/nextjs/server';

export type AppRole = 'MANAGER' | 'STAFF' | 'VIEWER';

export type AuthUser = {
  userId: string;
  role: AppRole;
  name: string;
  storeId: string | null; // Viewers are assigned to a specific store
};

export async function getAuthUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');

  const role = (user.publicMetadata?.role as AppRole) || 'VIEWER';
  const storeId = (user.publicMetadata?.storeId as string) || null;

  return {
    userId: user.id,
    role,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Unknown',
    storeId,
  };
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await getAuthUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Insufficient permissions. Required: ${allowedRoles.join(' or ')}`);
  }
  return user;
}

export async function requireManager() {
  return requireRole(['MANAGER']);
}

export async function requireStaffOrAbove() {
  return requireRole(['MANAGER', 'STAFF']);
}
