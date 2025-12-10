export function getBaseUrl(headers: Headers) {
    const host = headers.get("x-forwarded-host") || headers.get("host");
    const protocol = headers.get("x-forwarded-proto") || "http";

    // Handle potential comma-separated protocols from multiple proxies
    const proto = protocol.split(',')[0].trim();

    return host ? `${proto}://${host}` : "http://localhost:3000";
}
