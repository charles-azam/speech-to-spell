#!/usr/bin/env bash
# One-time server setup for EC2 VPS (Ubuntu 24.04)
set -euo pipefail

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

echo "=== Cloning repo ==="
cd /root
git clone https://github.com/YOUR_USERNAME/speech-to-spell.git
cd speech-to-spell

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Create .env with your API keys:"
echo "     MISTRAL_API_KEY=..."
echo "     ELEVENLABS_API_KEY=..."
echo "     ALLOWED_ORIGINS=https://your-project.pages.dev,https://game.yourdomain.com"
echo ""
echo "  2. Start the services:"
echo "     docker compose up -d"
