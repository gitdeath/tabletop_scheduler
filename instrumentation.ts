export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const token = process.env.TELEGRAM_BOT_TOKEN;

        if (token) {
            console.log("🤖 Telegram Bot Token found. Initializing Poller...");
            try {
                // Dynamically import to avoid build-time issues if libs aren't ready
                const { startPolling } = await import("./lib/telegram-poller");
                startPolling();
            } catch (err) {
                console.error("❌ Failed to start Telegram Poller:", err);
            }
        }
    }
}
