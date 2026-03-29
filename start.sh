#!/bin/sh
set -e

# Initialize database if it doesn't exist
if [ ! -f ./prisma/dev.db ]; then
  echo "🗄️ Creating database..."
  npx prisma db push --skip-generate 2>/dev/null || echo "⚠️ prisma db push failed, trying alternative..."
fi

# Start the app
exec node server.js
