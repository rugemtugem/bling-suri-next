#!/bin/sh
set -e

# Copy database template if no database exists
if [ ! -f ./data/app.db ]; then
  echo "🗄️  Creating database from template..."
  cp ./seed.db ./data/app.db
  echo "✅  Database ready"
else
  echo "📦  Database already exists"
fi

echo "🚀  Starting server..."
exec node server.js
