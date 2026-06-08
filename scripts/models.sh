#!/bin/bash
# ──────────────────────────────────────────────
# models.sh — Manage Gemma 4 models
# Usage: ./scripts/models.sh [list|pull|remove|switch]
# ──────────────────────────────────────────────

OLLAMA_URL="http://localhost:11434"

case "$1" in
  list)
    echo "📦 Models currently installed:"
    curl -s "${OLLAMA_URL}/api/tags" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('models', []):
    size = m.get('size', 0) / (1024**3)
    print(f\"  {m['name']:30s}  {size:.1f} GB\")
"
    ;;
  pull)
    MODEL="${2:-gemma4:e2b}"
    echo "⬇ Pulling ${MODEL}..."
    curl -s -X POST "${OLLAMA_URL}/api/pull" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"${MODEL}\"}" --no-buffer
    echo ""
    echo "✅ Done"
    ;;
  remove)
    MODEL="${2}"
    if [ -z "$MODEL" ]; then echo "Usage: ./scripts/models.sh remove <model>"; exit 1; fi
    echo "🗑 Removing ${MODEL}..."
    curl -s -X DELETE "${OLLAMA_URL}/api/delete" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"${MODEL}\"}"
    echo "✅ Removed"
    ;;
  switch)
    MODEL="${2}"
    if [ -z "$MODEL" ]; then echo "Usage: ./scripts/models.sh switch <model>"; exit 1; fi
    sed -i "s/^GEMMA_MODEL=.*/GEMMA_MODEL=${MODEL}/" .env
    echo "✅ Model switched to ${MODEL}"
    echo "   Restart with: docker compose restart model-init"
    ;;
  *)
    echo "Usage: ./scripts/models.sh <command>"
    echo ""
    echo "Commands:"
    echo "  list              List installed models"
    echo "  pull <model>      Download a model"
    echo "  remove <model>    Remove a model"
    echo "  switch <model>    Change active model in .env"
    echo ""
    echo "Available models:"
    echo "  gemma4:e2b   ~1GB   CPU-friendly"
    echo "  gemma4:e4b   ~2.5GB CPU-friendly"
    echo "  gemma4:12b   ~7GB   8GB+ RAM"
    echo "  gemma4:26b   ~15GB  GPU recommended"
    ;;
esac
