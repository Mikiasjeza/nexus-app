# Nexus runner (free option)

A small code runner that answers the same API calls as Judge0, so Nexus uses
it with the same two settings (`JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`). Unlike
Judge0 it runs on **ARM as well as x86**, which means it fits **Oracle
Cloud's Always Free Ampere A1** tier: no monthly bill.

It also gives candidates newer languages than Judge0 CE 1.13.1: Python 3.12
and Node.js 22 (pinned images, changeable in `/etc/nexus-runner.env`).

## How it keeps code contained

Every run is a fresh container that is deleted afterwards:

- **gVisor** (`runsc`): the program talks to a user-space kernel, not the
  host's. Setup stops if gVisor doesn't work, unless you explicitly accept
  plain Docker isolation with `ALLOW_RUNC=1`.
- No network (`--network none`), read-only filesystem with a 16 MB scratch
  area, all Linux capabilities dropped, no privilege escalation, an
  unprivileged user.
- Caps: 1 CPU, the memory Nexus asks for (at most 512 MB), 64 processes,
  1 MB files, 10 s of run time, 1 MB of output.
- Code arrives on standard input and is never written to the server's disk.
- The runner itself listens on 127.0.0.1 only, behind Caddy (HTTPS) and a
  secret token, runs as its own user, and reaches nothing but Docker.

## Set up on Oracle Cloud (free)

**Before you start, know Oracle's terms.** The Always Free Ampere A1
allowance is currently 2 OCPUs and 12 GB of memory (Oracle halved it in June
2026), plenty for this. Oracle may **reclaim idle Always Free instances**:
one counts as idle when, over 7 days, its CPU, network and memory use all
stay under 20% (95th percentile). A quiet runner can meet that. If yours is
reclaimed, recreate it with the steps below (about 15 minutes) and update
the two values in Vercel; nothing on it needs backing up. Signing up asks for
a card to verify identity; Always Free resources aren't charged. Free A1
capacity is sometimes unavailable in busy regions; trying another
availability domain or later usually works.

1. In the Oracle Cloud console, create a **Compute instance**: image
   **Canonical Ubuntu 24.04**, shape **VM.Standard.A1.Flex** with 2 OCPUs
   and 12 GB (both within Always Free). Add your SSH key.
2. In the instance's **subnet → security list**, add ingress rules for
   **TCP 80** and **TCP 443** from `0.0.0.0/0`.
3. Point a DNS **A record** (e.g. `runner.yourdomain.com`) at the instance's
   public IP.
4. Copy this folder (`server.js` and `setup.sh`) to the server and run:
   ```bash
   sudo bash setup.sh runner.yourdomain.com you@yourdomain.com
   ```
   It installs Docker and gVisor, pulls the language images, starts the
   runner and Caddy, opens ports 80 and 443 in Oracle's built-in iptables
   rules, runs a test program in the sandbox, and prints two values.
5. Add them in Vercel (Project → Settings → Environment Variables →
   Production) and redeploy:
   - `JUDGE0_URL` = `https://runner.yourdomain.com`
   - `JUDGE0_AUTH_TOKEN` = the printed token (keep it secret)
6. Open `/admin/reviews` in Nexus. The **Code runner** panel should say
   _Nexus runner 1.0.0 connected_ with Python 3.12 and Node.js 22.

Any other Ubuntu 24.04 VM works the same way, ARM or x86 (a paid one avoids
Oracle's idle reclaim).

## Looking after it

- Status and logs: `systemctl status nexus-runner`, `journalctl -u nexus-runner -n 100`
- After editing `/etc/nexus-runner.env`: `sudo systemctl restart nexus-runner`
- Change language versions: set `RUNNER_PYTHON_IMAGE` / `RUNNER_NODE_IMAGE`,
  `docker pull` the new image, restart. Nexus picks the new version up
  within ten minutes.
- Security updates: `sudo apt install unattended-upgrades`
- Rotate the token: delete the `RUNNER_TOKEN=` value from
  `/etc/nexus-runner.env`, run `setup.sh` again, update Vercel.

## Judge0 instead?

`infra/judge0` sets up Judge0 CE, the more established project, on a paid
x86 server. Nexus works with either; you only change the two values.
