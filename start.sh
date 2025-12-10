#!/bin/sh
set -e

echo "🚀 Starting Tabletop Scheduler..."
echo "📂 Current user: $(whoami)"
echo "📂 Checking /app/data permissions..."
ls -ld /app/data

# Run migrations
echo "⚙️ Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "🟢 Starting Next.js server..."
exec node server.js
