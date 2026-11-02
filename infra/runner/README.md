# Nexus runner (free option)

A small code runner that answers the same API calls as Judge0, so Nexus uses
it with the same two settings (`JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`). Unlike
Judge0 it runs on **ARM as well as x86**, which means it fits **Oracle
Cloud's Always Free Ampere A1** tier: no monthly bill. Candidates get Python
3.12 and Node.js 22.

## Set it up for free (about 30 minutes, no command line)

You need: a computer with a browser. Nothing here costs money.

**A. Get a free web address (DuckDNS)**

1. Go to [duckdns.org](https://www.duckdns.org) and sign in (GitHub, Google
   and others work).
2. Type a name, e.g. `nexus-runner-yourname`, and click **add domain**. Your
   address is now `nexus-runner-yourname.duckdns.org`. Leave the tab open.

**B. Prepare the setup script**

3. Open [`oracle-cloud-init.sh`](oracle-cloud-init.sh) and copy all of it
   into a plain text editor (Notepad, TextEdit).
4. Near the top, replace `CHANGE-ME.duckdns.org` with your DuckDNS address.
5. Replace the second `CHANGE-ME` with a long random password: 40 or more
   letters and digits, no spaces or quotes. A password manager's generator
   is ideal. Keep it: you'll paste it into Vercel later.

**C. Create the free server (Oracle Cloud)**

6. Sign up at [cloud.oracle.com](https://cloud.oracle.com). Oracle asks for a
   card to verify who you are; Always Free resources aren't charged.
7. In the console, open **Compute → Instances → Create instance**:
   - **Image:** Canonical Ubuntu **24.04**.
   - **Shape:** Ampere → **VM.Standard.A1.Flex**, 2 OCPUs, 12 GB memory
     (the console marks it "Always Free-eligible").
   - **Networking:** keep the defaults, with a public IPv4 address.
   - **SSH keys:** let Oracle generate a key pair and download it (you won't
     need it unless something goes wrong).
   - **Show advanced options → Management → Paste cloud-init script:** paste
     your edited script.
   - Click **Create**. If Oracle says it is _out of capacity_, try another
     availability domain or try again later; free ARM capacity comes and goes.
8. When the instance is running, copy its **Public IP address**.
9. On the instance page, open the **subnet → security list → Add ingress
   rules**, and add two rules with source `0.0.0.0/0`: **TCP port 80** and
   **TCP port 443**.

**D. Connect the pieces**

10. Back on DuckDNS, paste the public IP into the **current ip** box next to
    your address and click **update ip**.
11. Wait about 10 minutes while the server installs itself, then open
    `https://your-address.duckdns.org/about` in a browser. A page saying
    _Unauthorized_ means it's working: it only answers with the password.
12. In Vercel, open the **nexus-app** project → **Settings → Environment
    Variables**, and add for **Production**:
    - `JUDGE0_URL` = `https://your-address.duckdns.org`
    - `JUDGE0_AUTH_TOKEN` = the password from step 5
13. Redeploy (Deployments → latest → Redeploy).
14. Open `/admin/reviews` on your site (your email must be in
    `ADMIN_EMAILS`). The **Code runner** panel should say _Nexus runner 1.0.0
    connected_ with Python 3.12 and Node.js 22, and Python opens for
    candidates.

**If step 11 doesn't work after 20 minutes:** check that ports 80 and 443
are open (step 9) and that DuckDNS shows the right IP (step 10). The server's
own log is in Oracle: instance → **Console connection → Console history**,
or over SSH with `sudo tail -100 /var/log/cloud-init-output.log`.

### Oracle's terms to know

- The Always Free Ampere allowance is currently 2 OCPUs and 12 GB in total
  (Oracle halved it in June 2026). This setup uses all of it.
- Oracle **may reclaim idle Always Free instances**: one counts as idle when,
  over 7 days, its CPU, network and memory use all stay under 20%. A quiet
  runner can meet that. Nexus then shows "not graded yet" for new
  submissions, never a fail. Recreate the instance with the same script (the
  runner stores nothing) and update the IP in DuckDNS.
- If the instance's public IP ever changes, update it in DuckDNS.

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
- The runner itself listens on 127.0.0.1 only, behind Caddy (HTTPS) and the
  secret token, runs as its own user, and reaches nothing but Docker.

## Other ways to install

- **Any Ubuntu 24.04 server (ARM or x86), over SSH:** copy `server.js` and
  `setup.sh` to it and run `sudo bash setup.sh your.domain [you@email]`. It
  prints the two Vercel values at the end. A paid VM avoids Oracle's idle
  reclaim.
- **Judge0 instead:** `infra/judge0` sets up Judge0 CE on a paid x86 server.
  Nexus works with either; only the two values change.

## Looking after it

- Status and logs: `systemctl status nexus-runner`, `journalctl -u nexus-runner -n 100`
- After editing `/etc/nexus-runner.env`: `sudo systemctl restart nexus-runner`
- Change language versions: set `RUNNER_PYTHON_IMAGE` / `RUNNER_NODE_IMAGE`,
  `docker pull` the new image, restart. Nexus picks the new version up within
  ten minutes.
- Security updates: `sudo apt install unattended-upgrades`
- Rotate the token: put a new one in `/etc/nexus-runner.env`, restart the
  service, and update Vercel.

## For developers

`oracle-cloud-init.sh` is generated from `server.js` and `setup.sh` by
`node infra/runner/build-cloud-init.js`; a test fails if it is out of date.
