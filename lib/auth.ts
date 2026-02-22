import { currentUser } from '@clerk/nextjs/server';

export type AppRole = 'MANAGER' | 'STAFF' | 'VIEWER';

export async function getAuthUser() {
  const user = await currentUser();
  if (!user) throw new Error('Not authenticated');

  // Role is stored in Clerk public metadata
  // Set via Clerk Dashboard or API: user.publicMetadata.role = "MANAGER"
  const role = (user.publicMetadata?.role as AppRole) || 'VIEWER';

  return {
    userId: user.id,
    role,
    name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Unknown',
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
