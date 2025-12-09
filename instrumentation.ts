export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const publicUrl = process.env.PUBLIC_URL;

        if (token && publicUrl && publicUrl !== "https://your-domain.com") {
            console.log("Found Telegram Token & Public URL. Configuring Webhook...");
            try {
                // Construct the webhook URL
                // Ensure publicUrl doesn't have a trailing slash for cleanliness, though URL constructor handles it.
                const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/telegram/webhook`;
                const tgUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`;

                const res = await fetch(tgUrl);
                const data = await res.json();

                if (data.ok) {
                    console.log(`✅ Telegram Webhook set successfully to: ${webhookUrl}`);
                } else {
                    console.error("❌ Failed to set Telegram Webhook:", data);
                }
            } catch (err) {
                console.error("❌ Error setting Telegram Webhook:", err);
            }
        } else {
            if (token && (!publicUrl || publicUrl === "https://your-domain.com")) {
                console.log("ℹ️ Telegram Token found, but PUBLIC_URL is missing or default. Skipping automatic webhook registration.");
                console.log("   Set PUBLIC_URL in .env to enable auto-config.");
            }
        }
    }
}
