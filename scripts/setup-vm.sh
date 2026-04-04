#!/bin/bash
# GrandGridStudio VM Setup Script
# Run on a fresh Ubuntu 24.04 server (Hetzner, DigitalOcean, or Oracle Cloud)

set -e

echo "=== GrandGridStudio VM Setup ==="

# 1. System updates
echo "→ Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo "→ Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Claude Code
echo "→ Installing Claude Code..."
npm install -g @anthropic-ai/claude-code

# 4. Install Playwright dependencies (Chromium + system libs)
echo "→ Installing Playwright system dependencies..."
sudo npx playwright install-deps chromium

# 5. Create project directory and user
echo "→ Setting up project..."
sudo useradd -m -s /bin/bash grandgrid 2>/dev/null || true
sudo mkdir -p /home/grandgrid/Nonogramproject2026
sudo mkdir -p /var/log/grandgrid
sudo mkdir -p /tmp/grandgrid-screenshots
sudo chown -R grandgrid:grandgrid /home/grandgrid /var/log/grandgrid /tmp/grandgrid-screenshots

# 6. Clone repo
echo "→ Cloning repository..."
sudo -u grandgrid git clone https://github.com/yanivtager/Nonogramproject2026.git /home/grandgrid/Nonogramproject2026 2>/dev/null || \
  (cd /home/grandgrid/Nonogramproject2026 && sudo -u grandgrid git pull)

# 7. Install automation dependencies
echo "→ Installing automation dependencies..."
cd /home/grandgrid/Nonogramproject2026/automation
sudo -u grandgrid npm install
sudo -u grandgrid npx playwright install chromium

# 8. Copy env file
echo "→ Setting up environment..."
sudo -u grandgrid cp /home/grandgrid/Nonogramproject2026/config/.env.example /home/grandgrid/Nonogramproject2026/.env
echo "⚠️  Edit /home/grandgrid/Nonogramproject2026/.env with your actual keys!"

# 9. Set up cron
echo "→ Installing crontab..."
sudo -u grandgrid crontab /home/grandgrid/Nonogramproject2026/config/crontab.txt

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase URL, keys, Resend API key, and Anthropic key"
echo "2. Run initial login setup: node automation/tasks/setup-logins.mjs"
echo "   (This opens a visible browser so you can log into Etsy, Pinterest, Reddit, Instagram)"
echo "3. Test with: cd automation && node tasks/message-sweep.mjs"
echo "4. Cron will handle the rest automatically"
