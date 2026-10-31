# Judge0 for Nexus

Nexus runs candidates' Python (and JavaScript/TypeScript, when Judge0 offers
Node.js 18+) on [Judge0 CE](https://github.com/judge0/judge0), an
open-source sandbox for untrusted code, on its own server. Nothing a
candidate writes runs on the Vercel app or near the database.

## Option A: your own server (recommended)

Fixed cost, no per-run fees, and the strongest isolation from Nexus.

**What you need**

- An **x86-64** VM with **Ubuntu 22.04**, 2 vCPU and 4 GB RAM. Budget hosts
  charge roughly €4–8 a month for this; check current prices. ARM servers
  (including Oracle's free Ampere tier) can't run Judge0's images; for a
  free setup there, use the Nexus runner in [`infra/runner`](../runner/README.md).
- A domain or subdomain for it, e.g. `judge.yourdomain.com`, with an
  **A record** pointing at the VM's IP address.
- The VM should contain nothing else: no database copies, no keys.

**Steps**

1. Create the VM and point the DNS record at it.
2. Copy `setup.sh` to the server and run it as root:
   ```bash
   sudo bash setup.sh judge.yourdomain.com you@yourdomain.com
   ```
3. The first run switches the kernel to cgroup v1 (Judge0's sandbox needs
   it) and asks you to reboot. Reboot, then run the same command again.
4. At the end it prints two values. Add them in Vercel
   (Project → Settings → Environment Variables → Production):
   - `JUDGE0_URL` = `https://judge.yourdomain.com`
   - `JUDGE0_AUTH_TOKEN` = the printed token (keep it secret)
5. Redeploy Nexus, sign in with an account listed in `ADMIN_EMAILS`, and open
   `/admin/reviews`. The **Code runner** panel should say _connected_ and
   show the Python and Node.js versions it found.

**What the script locks down**

- Programs can't use the network, and callers can't switch it on.
- Hard upper limits: 5 s CPU, 10 s wall time, 256 MB memory, a queue of 50.
- Compiler options, command-line arguments, extra files and deletion are off.
- Judge0 listens on 127.0.0.1 only; the outside world reaches it through
  Caddy (automatic HTTPS) and needs the token.
- Only SSH, HTTP and HTTPS are open in the firewall.

**Looking after it**

- Logs: `cd /opt/judge0 && docker compose logs --tail 100 server workers`
- Restart: `cd /opt/judge0 && docker compose restart`
- Turn on automatic security updates: `sudo apt install unattended-upgrades`
- To rotate the token, delete the `AUTHN_TOKEN=` value in
  `/opt/judge0/judge0.conf`, run `setup.sh` again, and update Vercel.

## Option B: RapidAPI (no server)

Judge0 CE is also sold as an API on RapidAPI. Subscribe to it there, then
set `JUDGE0_RAPIDAPI_KEY` in Vercel instead of `JUDGE0_URL`. The free plan
allows only a small number of runs a day, enough for trying it out; paid
plans charge by volume. Your code still never runs on the Nexus servers.

## Settings in Nexus

| Variable                          | Meaning                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN` | Your server (option A).                                                                |
| `JUDGE0_RAPIDAPI_KEY`             | RapidAPI (option B), used when `JUDGE0_URL` is empty.                                  |
| `JUDGE0_DAILY_LIMIT`              | Calls to Judge0 per UTC day before runs pause (default 1,000). Grading gets 20% extra. |
| `JUDGE0_JAVASCRIPT`               | `off` keeps JavaScript/TypeScript in the in-app QuickJS sandbox.                       |
| `JUDGE0_PYTHON_LANGUAGE_ID`       | Pin a Python version by id. Normally detected: the newest Python 3 on the server.      |
| `JUDGE0_JAVASCRIPT_LANGUAGE_ID`   | Pin a Node.js version by id. Normally detected: the newest Node.js 18 or later.        |

## How Nexus uses it

Each run is one submission: the candidate's function plus a small harness
that calls it once per test and prints the results as JSON. Hidden tests'
expected answers never leave the Nexus server; comparison happens there.
A typical attempt makes 10–40 practice runs and 2 grading runs. Attempts are
capped at 60 runs and practice on Judge0 needs an account. At the daily cap,
runs pause; grading has 20% extra headroom, and anything past that is marked
"not graded yet" (never failed) and can be retried from `/admin/reviews`.
