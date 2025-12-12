import crypto from 'crypto';

const SECRET = process.env.TELEGRAM_BOT_TOKEN || "fallback-secret-for-dev";

// 15 minutes in seconds
const EXPIRATION_SECONDS = 15 * 60;

/**
 * Generates a time-bound, signed token for secure recovery.
 * Format: <timestamp>-<signature>
 */
export function generateRecoveryToken(slug: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(slug, timestamp);
    return `${timestamp}-${signature}`;
}

/**
 * Verifies a recovery token.
 * Checks:
 * 1. Signature integrity
 * 2. Expiration (15 mins)
 */
export function verifyRecoveryToken(slug: string, token: string): boolean {
    if (!token || !token.includes('-')) return false;

    const [timestampStr, signature] = token.split('-');
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) return false;

    // 1. Check Expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > timestamp + EXPIRATION_SECONDS) {
        return false;
    }

    // 2. Check Signature
    const expectedSignature = sign(slug, timestamp);

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

function sign(slug: string, timestamp: number): string {
    return crypto
        .createHmac('sha256', SECRET)
        .update(`${slug}:${timestamp}`)
        .digest('hex');
}
