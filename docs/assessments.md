# Skill assessments

Nexus verifies a skill by watching someone use it: a timed, hands-on task,
a follow-up that changes the requirement, and short questions about their
own work. A pass issues a credential anyone can check at `/verify/<id>`.

Everything runs on free tiers. Python needs a code runner on its own server:
the Nexus runner (`infra/runner`) on Oracle Cloud's Always Free tier costs
nothing; Judge0 (`infra/judge0`) on a small paid server is the alternative.

## What exists today

| Skill            | Workspace    | Runs on                               | Challenges                               |
| ---------------- | ------------ | ------------------------------------- | ---------------------------------------- |
| Python           | Code editor  | Code runner (`infra/runner`)          | Ledger summary, Log triage, Reorder plan |
| JavaScript       | Code editor  | Judge0 with Node.js 18+, else QuickJS | Ledger summary, Log triage, Reorder plan |
| TypeScript       | Code editor  | Types removed, then as JavaScript     | Ledger summary, Log triage, Reorder plan |
| SQL              | Query editor | SQLite (sql.js) in a worker           | Sales cleanup                            |
| Business Writing | Text editor  | Deterministic checks + AI             | Project delay email                      |

Without a code runner, Python shows as "Opening soon". Two kits set one up:
[`infra/runner`](../infra/runner/README.md), the free Nexus runner (ARM or
x86, fits Oracle's Always Free tier, Python 3.12 and Node.js 22, each run in
a gVisor sandbox), or [`infra/judge0`](../infra/judge0/README.md), Judge0 CE
on a paid x86 server. Both answer the same API, so Nexus treats them alike;
"Judge0" below means either.

**Challenge pool.** Coding assessments draw one of three challenges per
attempt (by seed), and a retake draws one the candidate hasn't had. Each
challenge also varies its rules per attempt (fee threshold, reporting
threshold, safety and cover days), so a leaked solution covers little.

**Where code runs.** Python always runs on Judge0, on a separate server.
JavaScript and TypeScript run there too whenever the Judge0 server offers
Node.js 18 or newer (set `JUDGE0_JAVASCRIPT=off` to opt out); otherwise they
run in QuickJS, a separate JavaScript engine compiled to WebAssembly, inside
the app's process but with no access to Node, the filesystem or the network.
Judge0 is the stronger isolation; QuickJS is the free fallback. Language
versions come from the server's `/languages` list (newest Python 3, newest
Node.js 18+) and are shown to candidates as "Runs on …". SQL always runs in
sql.js on a throwaway in-memory database in a worker thread.

**Local development.** With `ASSESSMENT_DEV_PYTHON=pyodide` (and any
`NODE_ENV` but production), Python runs in Pyodide (CPython compiled to
WebAssembly) in a worker thread, so you can try Python without a Judge0
server. Pyodide is not a security sandbox, so this is refused in production.
The test suite uses the same runner to prove every Python reference answer
through the exact harness Judge0 runs.

## How an attempt works

```
CREATED → READY → IN_PROGRESS → SUBMITTED → EVALUATING → COMPLETED
                                                       ↘ PENDING_REVIEW → COMPLETED
exits: CANCELLED (before starting), EXPIRED (time ran out with nothing saved),
       FAILED_SYSTEM (grading broke; retried later; never counts against anyone)
```

`lib/assessments/state.ts` is the only place transitions are defined. Status
updates are conditional (`UPDATE … WHERE status = expected`), so a double
submit or two tabs can't both win.

- **Seed.** Each attempt gets a random seed stored on the server. It
  generates the attempt's parameters (fee rule, dataset, email scenario) and
  its hidden tests. The browser never sees the seed for a real attempt.
- **Stages.** `main` → `followup` → `explain`. Each stage is locked on
  submit (`AssessmentSubmission`, unique per attempt and stage, with a
  SHA-256 of the payload). The follow-up starts from the submitted main work.
- **Clock.** The deadline is set on the server when the candidate starts.
  Drafts autosave. When time runs out, whatever was saved is locked and
  graded; with nothing saved for the main task the attempt expires.
- **Practice rounds** (`/assessments/practice/<slug>`) use the same engine
  but keep everything in the browser, check only the automatic criteria, use
  no AI, store nothing and issue nothing. Guests can use them.

## Grading

Each rubric (`lib/assessments/challenges/*`) is versioned and lists weighted
criteria with a source:

- `tests:*`, `sql:*`, `checks:*` are **deterministic**: hidden tests, query
  results compared with a reference query, content checks. They are final.
- `ai:*` are **judgement**: code quality, insight, tone, explanations.

Rules in `lib/assessments/grading.ts`:

1. A failed deterministic gate (e.g. correctness below 70%) means not passed,
   whatever else happens.
2. If the pass mark is out of reach even with full marks on everything still
   open, the result is final.
3. Judgement criteria are scored 0–4 by the AI grader with verbatim quotes
   from the work. Quotes that don't appear in the work are dropped; a score
   of 3 or 4 without a real quote is capped at 2.
4. If no AI provider is configured, or the call fails, judgement criteria
   stay unscored and the attempt goes to a reviewer. Scores are never
   invented.
5. Integrity signals with severity `review` hold back a pass for a person.
   They never turn a pass into a fail on their own.

Comparison of answers (`compare.ts`) happens on the server, never inside the
sandbox, so a candidate's code can't patch it.

### Integrity signals

Recorded from the browser and the server: pastes (size), leaving the tab,
time to submit, text addressed to the grader, explanations that contradict
the work. In independent mode a single paste of 300+ characters into the
task sends a passing attempt to review; in AI-assisted mode it is noted only.
Pasted explanation answers go to review in both modes.

## Credentials

Issued only after a pass (by the system or a reviewer). Id format
`NX-XXXX-XXXX-XXXX` (60 random bits, Crockford base32). Each one records the
skill, level, score, mode (Independent or AI-assisted), identity level, the
rubric and challenge versions, and lasts 24 months. Passing again supersedes
the previous credential. Reviewers can revoke one with a reason (audit-logged).

Identity levels: **A** account holder (what exists today), **B** identity
checked, **C** supervised. The verify page says plainly which one applies.

Credentials appear on the public Skill Passport (`/api/share/<id>` returns
`credentials`), separate from self-uploaded evidence.

## Reviews and appeals

`/admin/reviews` is for accounts whose email is in `ADMIN_EMAILS`. Reviewers
see the work, the scores, the signals and the event counts; they score open
judgement criteria (0–4) or decide they can't accept the work as the
candidate's own (with a note the candidate sees). Deterministic scores can't
be changed. They can also retry failed gradings and revoke credentials.

Candidates can appeal a result that did not pass within 30 days. An upheld
appeal sends the attempt back to review. Everything is written to `AuditLog`.

## Retakes

One open attempt per skill. After a result that did not pass, wait 24 hours.
At most 3 attempts per skill in 30 days. System failures and cancelled
attempts don't count.

## Sandboxes and the threat model

| Threat                              | Defence                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Code reads secrets or the network   | QuickJS has no `process`, `require`, filesystem, timers or network; Judge0 runs with networking off             |
| Infinite loops, memory bombs        | QuickJS interrupt deadline per call, 64 MB heap, 1 MB stack; Judge0 CPU/wall/memory limits                      |
| Faking a pass from inside the code  | Answers leave the sandbox as JSON through frozen built-ins and are compared on the server                       |
| Reading the hidden tests            | Generated server-side from a seed the browser never receives; runs show visible examples only                   |
| Hard-coding answers                 | Follow-up re-runs SQL on a different export; hidden ledgers differ per seed                                     |
| Destructive SQL                     | One SELECT/WITH only, on a fresh in-memory database per query, in a worker with a heap cap and a 4 s kill       |
| Prompt injection into the AI grader | Work is fenced as data with a random tag; strict JSON schema; quotes verified; steering text flagged for review |
| Double submits, races               | Conditional status updates and a unique index on submissions                                                    |

Never point `JUDGE0_URL` at a Judge0 server that can reach your database or
internal network.

## Configuration

| Variable                                | What for                                                                |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `AI_PROVIDER`, `AI_MODEL`, provider key | AI grading of judgement criteria. `groq` + `GROQ_API_KEY` is free.      |
| `ADMIN_EMAILS`                          | Comma-separated reviewer emails.                                        |
| `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN`      | Your code runner (`infra/runner` or `infra/judge0`).                    |
| `JUDGE0_RAPIDAPI_KEY`                   | Or Judge0 CE on RapidAPI, used when `JUDGE0_URL` is empty.              |
| `JUDGE0_DAILY_LIMIT`                    | Judge0 calls per UTC day before runs pause (default 1,000).             |
| `JUDGE0_JAVASCRIPT`                     | `off` keeps JavaScript/TypeScript in QuickJS even when Judge0 has Node. |
| `JUDGE0_PYTHON_LANGUAGE_ID`             | Pin a Python version by id (normally detected).                         |
| `JUDGE0_JAVASCRIPT_LANGUAGE_ID`         | Pin a Node.js version by id (normally detected).                        |
| `ASSESSMENT_DEV_PYTHON`                 | `pyodide` runs Python locally without Judge0. Ignored in production.    |

### Watching costs

Every automatic grading stores the AI call's tokens and estimated cost
(`AssessmentEvaluation.inputTokens`, `outputTokens`, `aiCostUsd`). The
reviewer console shows, for the last 30 days: gradings, total AI cost, AI
cost per graded assessment, and code runs candidates made while working.
Cost estimates use `AI_INPUT_COST_PER_MTOK` / `AI_OUTPUT_COST_PER_MTOK` (or
known Claude prices); they read $0 until those are set. Deterministic
grading has no per-use cost. Spending caps belong at the provider too: set a
monthly limit on the AI key and, if you use RapidAPI for Judge0, its quota.

Built-in limits that bound cost: 3 attempts per skill per 30 days, one AI
call per attempt, per-user and per-IP rate limits on runs, saves and
practice, and for Judge0 specifically:

- a daily cap (`JUDGE0_DAILY_LIMIT`, counted in the `RunnerUsage` table).
  At the cap, runs pause; final grading has 20% extra headroom, and past
  that an attempt is marked "not graded yet" (never failed) for a retry;
- 60 runs per attempt on Judge0 (300 elsewhere);
- practice runs on Judge0 need an account.

The reviewer console shows the runner's status, the language versions in
use, and today's Judge0 calls against the cap.

### Free options

- **AI grading:** Groq's free tier (`AI_PROVIDER=groq`, `GROQ_API_KEY`). Avoid
  free tiers whose terms let the provider train on submitted data (Gemini's
  free tier does), since candidate work is personal data.
- **Python:** the Nexus runner (`infra/runner`) on Oracle Cloud's Always Free
  Ampere A1 tier (2 OCPUs, 12 GB). Oracle may reclaim free instances that
  stay idle for a week; the runner holds no data, so recreating it takes
  about 15 minutes. Judge0 CE can't run there (x86-only images, and the free
  x86 VM is too small); run it with `infra/judge0` on a small paid VM, or
  start on RapidAPI's free plan for low volume.

## Database

Migration `prisma/migrations/20261023120000_add_skill_assessments` adds the
tables `AssessmentAttempt`, `AttemptEvent`, `AssessmentSubmission`,
`AssessmentEvaluation`, `Credential`, `AssessmentAppeal` and `AuditLog`;
`20261025120000_add_runner_usage` adds `RunnerUsage`. Both only create
tables. Until they are applied, the catalog and practice rounds work and real
attempts answer "Assessments are not set up on this server yet."

## Adding a skill or challenge

- **A coding challenge:** write a module in `lib/assessments/challenges/`
  that implements `CodeChallenge` (`code.ts`): instructions per stage and
  language, a trusted reference, visible examples and seeded hidden tests.
  Register it in `challenges/index.ts`; every coding assessment draws from
  the pool. Add a candidate-style answer in JavaScript and Python to
  `test-utils/assessment-fixtures.ts`; the tests then prove it in QuickJS and
  real CPython automatically.
- **A new skill:** add a catalog entry in `catalog.ts`, and teach
  `engine.ts` its workspace if it is a new kind.

## Before employers rely on it

The rubrics are version 1 and not yet validated. Before results are used in
hiring decisions: pilot each assessment with people of known ability and
check that scores separate them; have a second reviewer re-score a sample to
measure agreement; review the tasks for job relevance and bias; test the
workspaces with screen readers and keyboard only, and add extra-time
accommodations; and take legal advice on the jurisdictions you hire in.

## Not built yet

Spreadsheet (finance) and simulation (business) workspaces, design
assessments, employer-sent assessment invitations and reports, and identity
checks for level B. The types and the lifecycle already allow for them.
