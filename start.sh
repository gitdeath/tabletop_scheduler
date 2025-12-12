#!/bin/sh
set -e

echo "🚀 Starting Tabletop Scheduler..."
echo "📂 Current user: $(whoami)"

# Set default DATABASE_URL if missing
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ DATABASE_URL not set. Defaulting to file:/app/data/scheduler.db"
    export DATABASE_URL="file:/app/data/scheduler.db"
else
    echo "✅ DATABASE_URL is set."
fi

echo "📂 Checking /app/data permissions..."
ls -ld /app/data

# Run migrations
echo "⚙️ Running database migrations..."
npx prisma migrate deploy

# Setup Internal Cron Job (Simple background loop)
echo "⏰ Setting up internal cleanup loop..."
# Run once after 5 minutes to clean up any restart junk, then every 24 hours
(
    sleep 300
    while true; do
        echo "🧹 Running daily cleanup..."
        curl -s http://127.0.0.1:3000/api/cron/cleanup >> /app/data/cron.log 2>&1 || echo "❌ Cleanup failed" >> /app/data/cron.log
        sleep 86400
    done
) &

echo "✅ Cron loop started."

# Start the application
echo "🟢 Starting Next.js server..."
exec node server.js
