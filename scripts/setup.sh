#!/bin/bash
# ──────────────────────────────────────────────
# setup.sh — First-time setup for Gemma 4 Stack
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ──────────────────────────────────────────────

set -e

BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}${CYAN}✦ Gemma 4 Stack — Setup${RESET}"
echo "──────────────────────────────────"
echo ""

# Check Docker
if ! command -v docker &>/dev/null; then
  echo -e "${RED}✗ Docker not found. Install it from https://docs.docker.com/get-docker/${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker found${RESET}"

# Check Docker Compose
if ! docker compose version &>/dev/null 2>&1; then
  echo -e "${RED}✗ Docker Compose v2 not found. Update Docker.${RESET}"
  exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${RESET}"

# Copy .env if not exists
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ .env created from .env.example${RESET}"
else
  echo -e "${YELLOW}⚠ .env already exists — skipping${RESET}"
fi

echo ""
echo -e "${BOLD}Choose a model:${RESET}"
echo "  1) gemma4:e2b  → ~1GB  — Fastest, CPU-friendly (recommended for 4-8GB VPS)"
echo "  2) gemma4:e4b  → ~2.5GB — Better quality, still CPU-friendly"
echo "  3) gemma4:12b  → ~7GB  — High quality (needs 8GB+ RAM)"
echo "  4) gemma4:26b  → ~15GB — Best quality (GPU recommended)"
echo ""
read -p "Enter choice [1-4] (default: 1): " choice

case "${choice}" in
  2) MODEL="gemma4:e4b" ;;
  3) MODEL="gemma4:12b" ;;
  4) MODEL="gemma4:26b" ;;
  *) MODEL="gemma4:e2b" ;;
esac

# Update .env
sed -i "s/^GEMMA_MODEL=.*/GEMMA_MODEL=${MODEL}/" .env
echo -e "${GREEN}✓ Model set to: ${MODEL}${RESET}"

echo ""
echo -e "${BOLD}Starting services...${RESET}"
docker compose up -d --build

echo ""
echo -e "${BOLD}Waiting for Ollama to be ready...${RESET}"
for i in $(seq 1 30); do
  if curl -sf http://localhost:11434/api/version &>/dev/null; then
    echo -e "${GREEN}✓ Ollama is ready${RESET}"
    break
  fi
  echo -n "."
  sleep 2
done

echo ""
echo -e "${BOLD}Pulling model ${MODEL}...${RESET}"
echo "(This may take a few minutes on first run)"
docker exec ykchat_ollama ollama pull "${MODEL}"

echo ""
echo -e "${GREEN}${BOLD}✦ Done! Your Gemma 4 stack is running:${RESET}"
echo ""
echo -e "  ${CYAN}Chat UI:${RESET}      http://localhost:3000"
echo -e "  ${CYAN}Open WebUI:${RESET}   http://localhost:8080"
echo -e "  ${CYAN}Ollama API:${RESET}   http://localhost:11434"
echo ""
echo -e "  Run ${BOLD}docker compose logs -f${RESET} to see logs"
echo -e "  Run ${BOLD}docker compose down${RESET} to stop"
echo ""
