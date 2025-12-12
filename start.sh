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

# Setup Internal Cron Job (Daily at 3AM UTC)
echo "⏰ Setting up internal cleanup cron..."
echo "0 3 * * * curl http://127.0.0.1:3000/api/cron/cleanup >> /app/data/cron.log 2>&1" > /tmp/crontab
crontab /tmp/crontab
crond -b -L /app/data/cron.log
echo "✅ Cron daemon started."

# Start the application
echo "🟢 Starting Next.js server..."
exec node server.js
