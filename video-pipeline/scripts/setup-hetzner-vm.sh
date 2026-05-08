#!/usr/bin/env bash
# One-time setup for the Hetzner CPX22 render worker (178.104.137.140).
# Run as root (or with sudo) on the VM after first SSH login.
#
# Usage:
#   ssh root@178.104.137.140
#   curl -fsSL https://raw.githubusercontent.com/yanivtager/Nonogramproject2026/main/video-pipeline/scripts/setup-hetzner-vm.sh | bash
#   -- or --
#   scp scripts/setup-hetzner-vm.sh root@178.104.137.140:~ && ssh root@178.104.137.140 bash setup-hetzner-vm.sh

set -euo pipefail

REPO_DIR="/home/grandgrid/Nonogramproject2026"
SERVICE_FILE="/etc/systemd/system/grandgrid-render-worker.service"
USER="grandgrid"

echo "=== GrandGridStudio Render Worker Setup ==="

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
  curl \
  git \
  ffmpeg \
  python3 \
  python3-pip \
  fontconfig \
  fonts-noto \
  fonts-noto-cjk \
  fonts-liberation

# ── 2. Node.js 20 via NodeSource ──────────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node --version)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

# ── 3. Python edge-tts and whisper ────────────────────────────────────────────
echo "[3/7] Installing Python TTS/STT tools..."
pip3 install --quiet --break-system-packages edge-tts openai-whisper

# ── 4. Create service user ────────────────────────────────────────────────────
echo "[4/7] Creating service user '${USER}'..."
if ! id "${USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${USER}"
fi

# ── 5. Clone / update repo ────────────────────────────────────────────────────
echo "[5/7] Cloning repo to ${REPO_DIR}..."
if [ -d "${REPO_DIR}/.git" ]; then
  echo "Repo already cloned; pulling latest..."
  su -c "cd '${REPO_DIR}' && git pull --ff-only" "${USER}"
else
  su -c "git clone https://github.com/yanivtager/Nonogramproject2026.git '${REPO_DIR}'" "${USER}"
fi

# Install npm deps in video-pipeline
echo "Installing npm dependencies..."
su -c "cd '${REPO_DIR}/video-pipeline' && npm ci --ignore-scripts" "${USER}"

# ── 6. .env file ──────────────────────────────────────────────────────────────
echo "[6/7] Setting up .env..."
ENV_PATH="${REPO_DIR}/video-pipeline/.env"
if [ ! -f "${ENV_PATH}" ]; then
  cat > "${ENV_PATH}" <<'ENVEOF'
# Fill in real values before starting the service
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE
RENDER_WORKER_HOST=hetzner-cpx22
RENDER_OUT_DIR=/home/grandgrid/shorts-output/worker-renders
ENVEOF
  chown "${USER}:${USER}" "${ENV_PATH}"
  chmod 600 "${ENV_PATH}"
  echo "  *** Edit ${ENV_PATH} and fill in your credentials before starting the service ***"
else
  echo "  .env already exists; not overwriting."
fi

mkdir -p /home/grandgrid/shorts-output/worker-renders
chown -R "${USER}:${USER}" /home/grandgrid/shorts-output

# ── 7. Systemd service ────────────────────────────────────────────────────────
echo "[7/7] Installing systemd service..."
cp "${REPO_DIR}/video-pipeline/scripts/render-worker.service" "${SERVICE_FILE}"
chmod 644 "${SERVICE_FILE}"

systemctl daemon-reload
systemctl enable grandgrid-render-worker.service

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit ${ENV_PATH} with real credentials"
echo "  2. systemctl start grandgrid-render-worker"
echo "  3. systemctl status grandgrid-render-worker"
echo "  4. journalctl -u grandgrid-render-worker -f   (follow logs)"
