/**
 * Determines the fully qualified base URL for the application.
 * Critical for generating correct callback links when running behind reverse proxies or tunnels.
 * 
 * @param headers - Request headers to parse forwarded host/proto.
 */
export function getBaseUrl(headers?: Headers | null) {
    // Priority 1: Dynamic Headers (Standard X-Forwarded-For pattern)
    // This allows the app to adapt to whatever domain it's currently accessed from.
    if (headers) {
        const host = headers.get("x-forwarded-host") || headers.get("host");
        const protocol = headers.get("x-forwarded-proto") || "http";
        // Handle comma-separated protocols (e.g., "https, http" from some LBs)
        const proto = (typeof protocol === 'string' ? protocol.split(',')[0].trim() : "http");
        if (host) return `${proto}://${host}`;
    }

    // Priority 2: Localhost Fallback
    return "http://localhost:3000";
}
