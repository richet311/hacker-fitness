import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isMetricsRoute = createRouteMatcher(['/metrics']);
const isProtectedRoute = createRouteMatcher(['/dashboard']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // If user is not authenticated and trying to access protected routes
  if (!userId && (isMetricsRoute(req) || isProtectedRoute(req))) {
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('auth-required', 'true');
    return NextResponse.redirect(homeUrl);
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};