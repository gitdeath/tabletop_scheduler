import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Only check /manage routes
    if (request.nextUrl.pathname.endsWith('/manage')) {
        // e.g. /e/some-slug/manage
        const parts = request.nextUrl.pathname.split('/');
        const slug = parts[2]; // /e/[slug]/manage -> slug is index 2

        const adminToken = request.cookies.get(`tabletop_admin_${slug}`)?.value;

        if (!adminToken) {
            // Ideally we check if the token is valid in DB, but for now we just check presence
            // verification against DB would need edge-compatible DB or separate API call
            // For this "v2", simple cookie presence is a good start, 
            // or we just rely on the Page to check it (which we haven't done yet).
            // Let's redirect to the event page with a warning or just let them through 
            // but hiding sensitive buttons? 
            // The plan said "middleware/check for Admin access".

            // If no token, redirect to event page
            return NextResponse.redirect(new URL(`/e/${slug}`, request.url));
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/e/:slug*/manage',
}
