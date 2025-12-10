export function getBaseUrl(headers?: Headers | null) {
    // 1. Try Headers (Dynamic)
    if (headers) {
        const host = headers.get("x-forwarded-host") || headers.get("host");
        const protocol = headers.get("x-forwarded-proto") || "http";
        // Handle comma-separated protocols
        const proto = (typeof protocol === 'string' ? protocol.split(',')[0].trim() : "http");
        if (host) return `${proto}://${host}`;
    }

    // 2. Try Environment Variables (Static Fallback for Background Jobs)
    const envUrl = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (envUrl) return envUrl;

    // 3. Fallback to Localhost
    return "http://localhost:3000";
}
