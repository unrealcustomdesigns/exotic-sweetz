import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

const viewerAllowedRoutes = createRouteMatcher([
  '/viewer(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  const { userId } = await auth.protect();

  // Skip API routes — they have their own auth checks
  if (request.nextUrl.pathname.startsWith('/api')) return;

  // Fetch user metadata to check role
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata?.role as string) || 'VIEWER';

  if (role === 'VIEWER' && !viewerAllowedRoutes(request)) {
    const storeId = user.publicMetadata?.storeId as string;
    const dest = storeId ? `/viewer/${storeId}` : '/viewer/no-store';
    return NextResponse.redirect(new URL(dest, request.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
