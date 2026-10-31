#!/usr/bin/env bash
# Sets up the Nexus runner on a fresh Ubuntu 24.04 server, ARM64 or x86-64
# (including Oracle Cloud's free Ampere A1): Docker, the gVisor sandbox,
# pinned Python and Node images, the runner as a locked-down service, and
# Caddy in front for HTTPS. Safe to run again; it keeps the existing token.
#
# Usage, as root on the server, from the folder holding this script and server.js:
#   bash setup.sh runner.example.com [you@example.com]
# or unattended at first boot through oracle-cloud-init.sh. RUNNER_TOKEN in
# the environment sets the access token (40+ characters); otherwise one is
# generated. The email is optional (certificate expiry notices).
#
# Ports 80 and 443 must be open in your cloud provider's firewall (on Oracle:
# the subnet's security list). HTTPS starts as soon as the domain's DNS points
# at this server; Caddy keeps retrying until it does.
set -euo pipefail

DOMAIN="${1:?Usage: bash setup.sh <domain> [email for HTTPS certificates]}"
EMAIL="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="/opt/nexus-runner"
ENV_FILE="/etc/nexus-runner.env"
PYTHON_IMAGE="python:3.12.7-slim"
NODE_IMAGE="node:22.11.0-slim"
CADDY_IMAGE="caddy:2.8.4"

say() { printf '\n== %s\n' "$*"; }
# First boot often has unattended upgrades holding the package lock; wait for it.
apt_get() { apt-get -o DPkg::Lock::Timeout=900 -q "$@"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (sudo bash setup.sh ...)." >&2
  exit 1
fi
if [ ! -f "$HERE/server.js" ]; then
  echo "server.js must be next to this script." >&2
  exit 1
fi
if ! grep -q 'VERSION_ID="24.04"' /etc/os-release; then
  echo "Warning: written for Ubuntu 24.04; this is $(. /etc/os-release && echo "$PRETTY_NAME")."
fi

say "1/6 Packages"
apt_get update
apt_get install -y docker.io nodejs curl gnupg ca-certificates openssl
systemctl enable --now docker
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node.js 18+ is needed; this system has $(node --version). Use Ubuntu 24.04." >&2
  exit 1
fi

say "2/6 gVisor sandbox"
if ! command -v runsc > /dev/null; then
  curl -fsSL https://gvisor.dev/archive.key | gpg --dearmor --yes -o /usr/share/keyrings/gvisor-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" \
    > /etc/apt/sources.list.d/gvisor.list
  apt_get update
  apt_get install -y runsc
fi
# The package registers itself with Docker; make sure Docker has picked it up.
runsc install > /dev/null 2>&1 || true
systemctl restart docker
RUNTIME="runsc"
if ! docker run --rm --runtime=runsc hello-world > /dev/null 2>&1; then
  if [ "${ALLOW_RUNC:-}" = "1" ]; then
    echo "gVisor did not work; continuing with plain Docker isolation because ALLOW_RUNC=1."
    RUNTIME="runc"
  else
    echo "gVisor (runsc) could not run a container on this server." >&2
    echo "Fix that, or rerun with ALLOW_RUNC=1 to use plain Docker isolation (weaker)." >&2
    exit 1
  fi
fi
echo "Sandbox runtime: $RUNTIME"

say "3/6 Language images"
docker pull -q "$PYTHON_IMAGE"
docker pull -q "$NODE_IMAGE"

say "4/6 Runner service"
id nexus-runner > /dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin nexus-runner
# Docker access is what lets the runner start sandboxes; it needs nothing else.
usermod -aG docker nexus-runner
mkdir -p "$DIR"
install -m 0644 "$HERE/server.js" "$DIR/server.js"

TOKEN="${RUNNER_TOKEN:-}"
if [ -n "$TOKEN" ] && [ "${#TOKEN}" -lt 40 ]; then
  echo "RUNNER_TOKEN must be at least 40 characters." >&2
  exit 1
fi
if [ -z "$TOKEN" ] && [ -f "$ENV_FILE" ]; then
  TOKEN="$(grep '^RUNNER_TOKEN=' "$ENV_FILE" | cut -d= -f2- || true)"
fi
[ -n "$TOKEN" ] || TOKEN="$(openssl rand -hex 32)"
cat > "$ENV_FILE" <<ENV
HOST=127.0.0.1
PORT=2358
RUNNER_TOKEN=${TOKEN}
RUNNER_RUNTIME=${RUNTIME}
RUNNER_PYTHON_IMAGE=${PYTHON_IMAGE}
RUNNER_NODE_IMAGE=${NODE_IMAGE}
DOCKER_CONFIG=/tmp/.docker
ENV
chown root:nexus-runner "$ENV_FILE"
chmod 640 "$ENV_FILE"

cat > /etc/systemd/system/nexus-runner.service <<'UNIT'
[Unit]
Description=Nexus code runner
After=docker.service
Requires=docker.service

[Service]
User=nexus-runner
Group=nexus-runner
EnvironmentFile=/etc/nexus-runner.env
ExecStart=/usr/bin/node /opt/nexus-runner/server.js
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable nexus-runner
systemctl restart nexus-runner

say "5/6 HTTPS with Caddy"
{
  if [ -n "$EMAIL" ]; then printf '{\n\temail %s\n}\n\n' "$EMAIL"; fi
  cat <<CADDY
${DOMAIN} {
	encode gzip
	reverse_proxy 127.0.0.1:2358
}
CADDY
} > "$DIR/Caddyfile"
docker rm -f nexus-caddy > /dev/null 2>&1 || true
docker run -d --name nexus-caddy --restart always --network host \
  -v "$DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
  -v nexus-caddy-data:/data -v nexus-caddy-config:/config \
  "$CADDY_IMAGE" > /dev/null

say "6/6 Firewall"
if [ -f /etc/iptables/rules.v4 ] && command -v netfilter-persistent > /dev/null; then
  # Oracle's Ubuntu images ship iptables rules that reject everything but SSH.
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2> /dev/null ||
      iptables -I INPUT 1 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  done
  netfilter-persistent save > /dev/null
else
  apt_get install -y ufw
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

echo "Waiting for the runner to answer..."
for _ in $(seq 1 15); do
  if curl -fsS -H "X-Auth-Token: ${TOKEN}" http://127.0.0.1:2358/about > /dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS -H "X-Auth-Token: ${TOKEN}" http://127.0.0.1:2358/languages || {
  echo "The runner did not answer. Check: journalctl -u nexus-runner -n 50" >&2
  exit 1
}

# A real run through the sandbox, end to end.
PROBE="$(printf 'print(6 * 7)' | base64)"
RESULT="$(curl -fsS -X POST -H "X-Auth-Token: ${TOKEN}" -H 'Content-Type: application/json' \
  -d "{\"language_id\":1,\"source_code\":\"${PROBE}\"}" \
  'http://127.0.0.1:2358/submissions?base64_encoded=true&wait=true')"
if echo "$RESULT" | grep -q '"stdout":"NDIK"'; then
  echo
  echo "Sandboxed Python run: OK"
else
  echo "Sandboxed run failed: $RESULT" >&2
  exit 1
fi

# For reading back later over SSH: sudo cat /root/nexus-runner.txt
umask 077
printf 'JUDGE0_URL=https://%s\nJUDGE0_AUTH_TOKEN=%s\n' "$DOMAIN" "$TOKEN" > /root/nexus-runner.txt

cat <<DONE

The Nexus runner is running. Add these to the Nexus project in Vercel
(Settings > Environment Variables, Production), then redeploy:

  JUDGE0_URL=https://${DOMAIN}
  JUDGE0_AUTH_TOKEN=${TOKEN}

Keep the token secret; it is stored in ${ENV_FILE}.
Then open /admin/reviews in Nexus: the Code runner panel should say
"Nexus runner 1.0.0 connected".
DONE
