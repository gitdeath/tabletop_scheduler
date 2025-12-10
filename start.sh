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

# Start the application
echo "🟢 Starting Next.js server..."
exec node server.js
