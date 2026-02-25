#!/usr/bin/env bash
set -euo pipefail

echo "Geliştirme servisleri durduruluyor..."

# Port bazlı güvenli kapatma
for port in 3000 5001; do
  pids="$(lsof -ti:$port 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "- Port $port üzerindeki process(ler) kapatılıyor: $pids"
    kill -9 $pids 2>/dev/null || true
  else
    echo "- Port $port zaten boş"
  fi
done

echo "Tamamlandı."
