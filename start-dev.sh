#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

cleanup() {
  echo ""
  echo "Durduruluyor..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Backend başlatılıyor..."
(
  cd "$BACKEND_DIR"
  npm run dev
) &
BACKEND_PID=$!

echo "Frontend başlatılıyor..."
(
  cd "$FRONTEND_DIR"
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "Çalışıyor:"
echo "- Backend: http://localhost:5001"
echo "- Frontend: http://localhost:3000"
echo ""
echo "Durdurmak için: Ctrl + C"

wait "$BACKEND_PID" "$FRONTEND_PID"
