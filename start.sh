#!/bin/sh
set -e

echo "🗄️ Initializing database..."
npx prisma db push --skip-generate 2>&1 || echo "⚠️ DB push warning (may already exist)"

echo "🚀 Starting server..."
exec node server.js
