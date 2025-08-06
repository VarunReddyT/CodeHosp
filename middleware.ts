import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;
    
    // Protected routes
    const protectedRoutes = ['/upload', '/modifications'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    
    if (isProtectedRoute && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Add security headers
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
