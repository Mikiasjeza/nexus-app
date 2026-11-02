#!/usr/bin/env bash
# Sets up Judge0 CE for Nexus on a fresh Ubuntu 22.04 x86-64 server:
# cgroup v1 (Judge0's sandbox needs it), Docker, a firewall, Judge0 locked
# down (no network for programs, tight limits, an access token) and Caddy
# in front for HTTPS. Safe to run again; it keeps existing secrets.
#
# Usage, as root on the server:
#   bash setup.sh judge.example.com you@example.com
#
# The domain's DNS A record must already point at this server.
set -euo pipefail

DOMAIN="${1:?Usage: bash setup.sh <domain> <email for HTTPS certificates>}"
EMAIL="${2:?Usage: bash setup.sh <domain> <email for HTTPS certificates>}"
JUDGE0_VERSION="1.13.1"
DIR="/opt/judge0"

say() { printf '\n== %s\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (sudo bash setup.sh ...)." >&2
  exit 1
fi
if [ "$(uname -m)" != "x86_64" ]; then
  echo "Judge0 images are x86-64 only; this server is $(uname -m)." >&2
  exit 1
fi
if ! grep -q 'VERSION_ID="22.04"' /etc/os-release; then
  echo "Warning: Judge0 is tested on Ubuntu 22.04; this is $(. /etc/os-release && echo "$PRETTY_NAME")."
fi

say "1/6 cgroup v1"
if ! grep -q 'systemd.unified_cgroup_hierarchy=0' /proc/cmdline; then
  if ! grep -q 'systemd.unified_cgroup_hierarchy=0' /etc/default/grub; then
    sed -i 's/^GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 systemd.unified_cgroup_hierarchy=0"/' /etc/default/grub
    update-grub
  fi
  echo "cgroup v1 is set for the next boot. Reboot now (reboot), then run this script again."
  exit 0
fi
echo "cgroup v1 active."

say "2/6 Docker"
apt-get update -q
apt-get install -y -q docker.io docker-compose-v2 unzip curl openssl ufw
systemctl enable --now docker

say "3/6 Firewall (SSH, HTTP, HTTPS only)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
# Docker bypasses ufw for published ports, which is why Judge0 itself is
# published on 127.0.0.1 only (below) and reached through Caddy.

say "4/6 Judge0 ${JUDGE0_VERSION}"
mkdir -p "$DIR"
cd "$DIR"
if [ ! -f judge0.conf ]; then
  curl -fsSL -o judge0.zip "https://github.com/judge0/judge0/releases/download/v${JUDGE0_VERSION}/judge0-v${JUDGE0_VERSION}.zip"
  unzip -q judge0.zip
  cp -r "judge0-v${JUDGE0_VERSION}/." .
  rm -rf judge0.zip "judge0-v${JUDGE0_VERSION}"
fi

# Set KEY=VALUE in judge0.conf, replacing any existing line.
set_conf() {
  if grep -q "^$1=" judge0.conf; then
    sed -i "s|^$1=.*|$1=$2|" judge0.conf
  else
    printf '%s=%s\n' "$1" "$2" >> judge0.conf
  fi
}
# Keep a secret that is already set; otherwise generate one.
secret() {
  local current
  current="$(grep "^$1=" judge0.conf | head -n1 | cut -d= -f2- || true)"
  if [ -z "$current" ]; then
    current="$(openssl rand -hex 32)"
  fi
  set_conf "$1" "$current"
}

secret REDIS_PASSWORD
secret POSTGRES_PASSWORD
secret AUTHN_TOKEN
set_conf AUTHN_HEADER X-Auth-Token
# Programs never get network access, and callers can't turn it on.
set_conf ENABLE_NETWORK false
set_conf ALLOW_ENABLE_NETWORK false
# Upper bounds on what any caller may ask for.
set_conf MAX_CPU_TIME_LIMIT 5
set_conf MAX_WALL_TIME_LIMIT 10
set_conf MAX_MEMORY_LIMIT 256000
set_conf MAX_QUEUE_SIZE 50
# Features Nexus doesn't use stay off.
set_conf ENABLE_COMPILER_OPTIONS false
set_conf ENABLE_COMMAND_LINE_ARGUMENTS false
set_conf ENABLE_ADDITIONAL_FILES false
set_conf ENABLE_SUBMISSION_DELETE false
set_conf ENABLE_WAIT_RESULT true
chmod 600 judge0.conf

# Pin the image and keep the API off the public interface.
sed -i "s|judge0/judge0:latest|judge0/judge0:${JUDGE0_VERSION}|g" docker-compose.yml
sed -i 's|"2358:2358"|"127.0.0.1:2358:2358"|' docker-compose.yml

say "5/6 HTTPS with Caddy"
cat > Caddyfile <<CADDY
{
	email ${EMAIL}
}

${DOMAIN} {
	encode gzip
	reverse_proxy server:2358
}
CADDY
cat > docker-compose.override.yml <<'COMPOSE'
services:
  caddy:
    image: caddy:2.8.4
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - server

volumes:
  caddy_data:
  caddy_config:
COMPOSE

say "6/6 Starting"
docker compose up -d db redis
sleep 10
docker compose up -d

TOKEN="$(grep '^AUTHN_TOKEN=' judge0.conf | cut -d= -f2-)"
echo "Waiting for Judge0 to answer..."
for _ in $(seq 1 30); do
  if curl -fsS -H "X-Auth-Token: ${TOKEN}" http://127.0.0.1:2358/about > /dev/null 2>&1; then
    break
  fi
  sleep 5
done
if ! curl -fsS -H "X-Auth-Token: ${TOKEN}" http://127.0.0.1:2358/about; then
  echo "Judge0 did not answer. Check: docker compose -f ${DIR}/docker-compose.yml logs server" >&2
  exit 1
fi
echo
echo "Python versions on this server:"
curl -fsS -H "X-Auth-Token: ${TOKEN}" http://127.0.0.1:2358/languages | tr '}' '\n' | grep -o '"name":"Python[^"]*"' || true

cat <<DONE

Judge0 is running. Add these to the Nexus project in Vercel
(Settings > Environment Variables, Production), then redeploy:

  JUDGE0_URL=https://${DOMAIN}
  JUDGE0_AUTH_TOKEN=${TOKEN}

Keep the token secret. It is stored in ${DIR}/judge0.conf (readable by root only).
Then open /admin/reviews in Nexus: the Code runner panel should say "connected".
DONE
