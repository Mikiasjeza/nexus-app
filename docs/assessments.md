# Skill assessments

Nexus verifies a skill by watching someone use it: a timed, hands-on task,
a follow-up that changes the requirement, and short questions about their
own work. A pass issues a credential anyone can check at `/verify/<id>`.

Everything runs on free tiers. Python needs a code runner on its own server:
the Nexus runner (`infra/runner`) on Oracle Cloud's Always Free tier costs
nothing; Judge0 (`infra/judge0`) on a small paid server is the alternative.

## What exists today

Skills are grouped into labs, the verification environments shown on
`/assessments` (`lib/assessments/labs.ts`):

**Coding Lab**

- **Python**: code editor. Runs on the code runner (`infra/runner`). Challenges: Ledger summary, Log triage, Reorder plan.
- **JavaScript**: code editor. Runs on the code runner's Node.js 18+. Challenges: Ledger summary, Log triage, Reorder plan.
- **TypeScript**: code editor. Types removed, then run as JavaScript. Challenges: Ledger summary, Log triage, Reorder plan.

**Data Analytics Lab**

- **SQL**: query editor. Runs on the code runner, through Python's sqlite3. Challenges: Sales cleanup, Customer retention report.

**Finance Lab**

- **Financial Analysis**: spreadsheet and a memo. Formulas re-run with changed assumptions, plus AI. Challenge: Expansion decision.

**Creative and Design Studio**

- **UX Writing**: interface strings with character limits. Deterministic checks plus AI. Challenge: Interface copy rewrite.

**Business Simulation Lab**

- **Project Management**: plan editor. Deterministic checks plus AI. Challenge: Launch recovery plan.

**Communication Studio**

- **Business Writing**: text editor. Deterministic checks plus AI. Challenge: Project delay email.

- **Financial Analysis.** A fictional company considers opening another
  site. The candidate builds a three-year forecast in a spreadsheet that
  holds the base-case assumptions, working out Year 3 revenue, EBIT, margin,
  interest cover and the peak cash the company must put in, then writes a
  memo. Grading resets the assumption cells, reads the results, then sets
  the scenario cell to 85% (the downside case) and reads them again; in the
  follow-up it does the same with the new loan rate and rent. Only formulas
  that really depend on the assumptions pass: typed-in numbers fail as soon
  as an assumption changes. Results are compared with a model computed from
  the seed (within half a percent). The recommendation itself is never
  scored, so either answer can earn full marks when the reasoning holds.
- **The spreadsheet** (`lib/sheets`, `components/Assessments/Spreadsheet.tsx`)
  has its own formula engine, shared by the browser and grading: numbers,
  cell references and ranges, + − × ÷ ^ & and comparisons, and SUM, AVERAGE,
  MIN, MAX, COUNT, ROUND, ABS, IF, AND, OR, NOT and IFERROR. It parses
  formulas itself, with no eval: a formula can only read cells of its own
  sheet (12 columns by 60 rows at most) and call those functions, so it is
  data the app interprets, like a calculator, not a candidate program.
  Reference loops show #CYCLE!; other problems show #DIV/0!, #REF!, #NAME?,
  #VALUE! or #ERROR! instead of breaking anything.
- **Project Management.** A client launch with a budget, a team member on
  leave, a contractor and dependencies. The plan has one line per work item
  ("Item — Owner — Date"); checks confirm every item has a suitable,
  available owner, a finish date before launch, the dependency order and the
  contractor budget. The follow-up adds a requirement and raises the
  contractor's rate, so the old plan no longer fits the budget. The skill
  page and the credential say a short scenario is not proof of leadership or
  teamwork on a real team.
- **UX Writing.** Five interface strings (an error, a button, an empty state,
  a delete dialog) rewritten within character limits; the follow-up moves
  deletes to Trash for 30 days and tightens the button limit. Checks cover
  the limits, leftover codes and jargon, a next step, specific buttons and a
  dialog that matches the behaviour, so the score never rests on an AI's
  taste alone.
- **SQL.** Attempts draw one of two datasets. Customer retention has test
  accounts, hand-typed channel names, repeated order rows and cancelled
  orders; every generated dataset is built so that forgetting any one of
  those changes an answer.

Without a code runner, Python shows as "Opening soon". Two kits set one up:
[`infra/runner`](../infra/runner/README.md), the free Nexus runner (ARM or
x86, fits Oracle's Always Free tier, Python 3.12 and Node.js 22, each run in
a gVisor sandbox), or [`infra/judge0`](../infra/judge0/README.md), Judge0 CE
on a paid x86 server. Both answer the same API, so Nexus treats them alike;
"Judge0" below means either.

**Challenge pool.** Coding assessments draw one of three challenges per
attempt (by seed) and SQL one of two, and a retake draws one the candidate
hasn't had. Free practice uses each skill's first challenge; paid plans
practise them all. Each
challenge also varies its rules per attempt (fee threshold, reporting
threshold, safety and cover days), so a leaked solution covers little.

**Where code runs.** In production every candidate program runs on the
code runner, a separate server (`infra/runner` or Judge0), never on the app
server: Python on its Python 3, JavaScript and TypeScript on its Node.js 18
or newer, and SQL through a small Python program that uses Python's built-in
sqlite3. Each SQL query gets a fresh in-memory copy of the dataset, made
read-only, with an authorizer that allows reads only, a 1-second limit per
query and a 64 MB heap. The answer key runs in a separate call from the
candidate's queries, on the same engine. Without the runner, Python,
JavaScript, TypeScript and SQL show as "Opening soon" and grading waits:
the in-process sandboxes (QuickJS, sql.js, Pyodide) are for local
development and tests only and refuse to run in production. Only parsing
happens in the app (TypeScript types are stripped before the code is sent,
and every query is checked to be a single SELECT). Language versions come
from the server's `/languages` list (newest Python 3, newest Node.js 18+)
and are shown to candidates as "Runs on …".

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
  generates the attempt's parameters (fee rule, dataset, scenario, figures)
  and its hidden tests. The browser never sees the seed for a real attempt.
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

`/admin/reviews` is for accounts whose email is in `ADMIN_EMAILS` (the same
accounts can open the rest of `/admin`; see `docs/SIGN_IN.md`). Reviewers
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
| Code reads secrets or the network   | All candidate code runs on the code runner, never the app server, in gVisor with networking off                 |
| Infinite loops, memory bombs        | The runner's CPU, wall-clock, memory and process limits; SQL also gets a per-query time limit and a heap cap    |
| Faking a pass from inside the code  | Answers leave the sandbox as JSON through frozen built-ins and are compared on the server                       |
| Reading the hidden tests            | Generated server-side from a seed the browser never receives; runs show visible examples only                   |
| Hard-coding answers                 | Follow-up re-runs SQL on a different export; hidden ledgers differ per seed                                     |
| Destructive SQL                     | One SELECT/WITH only, on a fresh read-only in-memory database per query, with a reads-only authorizer           |
| Prompt injection into the AI grader | Work is fenced as data with a random tag; strict JSON schema; quotes verified; steering text flagged for review |
| Double submits, races               | Conditional status updates and a unique index on submissions                                                    |

Never point `JUDGE0_URL` at a Judge0 server that can reach your database or
internal network.

## Configuration

| Variable                                | What for                                                             |
| --------------------------------------- | -------------------------------------------------------------------- |
| `AI_PROVIDER`, `AI_MODEL`, provider key | AI grading of judgement criteria. `groq` + `GROQ_API_KEY` is free.   |
| `ADMIN_EMAILS`                          | Comma-separated admin emails: reviews, billing and the user list.    |
| `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN`      | Your code runner (`infra/runner` or `infra/judge0`).                 |
| `JUDGE0_RAPIDAPI_KEY`                   | Or Judge0 CE on RapidAPI, used when `JUDGE0_URL` is empty.           |
| `JUDGE0_DAILY_LIMIT`                    | Judge0 calls per UTC day before runs pause (default 1,000).          |
| `JUDGE0_PYTHON_LANGUAGE_ID`             | Pin a Python version by id (normally detected).                      |
| `JUDGE0_JAVASCRIPT_LANGUAGE_ID`         | Pin a Node.js version by id (normally detected).                     |
| `ASSESSMENT_DEV_PYTHON`                 | `pyodide` runs Python locally without Judge0. Ignored in production. |

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
- **A SQL challenge:** implement `SqlChallenge` (`sql.ts`): the tables, a
  seeded dataset with a changed export for the follow-up, and tasks with
  trusted reference queries. Register it in `challenges/index.ts` and add
  its id to the SQL entry's `challengeIds`. Make each trap in the data
  change an answer on every seed, and test that it does
  (`__tests__/lib/assessments/challenges.test.ts`).
- **A writing challenge:** implement `WritingChallenge` (`writing.ts`):
  facts, an optional table, an optional spreadsheet (`sheet`: labels,
  assumption inputs and answer cells), short answers (`fields`, e.g.
  figures or interface strings with character limits) and/or a long answer
  (`text`), and deterministic checks per stage. Sheet checks should reset
  the inputs, change them and read the results again with `sheetValues`. Checks should be lenient about format
  and strict about substance; text helpers are in `text.ts`. Add a strong
  candidate's answer to `test-utils/assessment-fixtures.ts` and test it
  passes every check on many seeds.
- **A new skill:** add a catalog entry in `catalog.ts` with its lab, its
  rubric and, where a pass could be over-read, a `note` saying what it does
  not show (shown on the skill page and the credential). Teach `engine.ts`
  its workspace if it is a new kind.

## Before employers rely on it

The rubrics (SQL v2, the rest v1) are not yet validated. Before results are used in
hiring decisions: pilot each assessment with people of known ability and
check that scores separate them; have a second reviewer re-score a sample to
measure agreement; review the tasks for job relevance and bias; test the
workspaces with screen readers and keyboard only, and add extra-time
accommodations; and take legal advice on the jurisdictions you hire in.

## Not built yet

Each lab's full workspace: a file explorer, restricted terminal and
documentation panel (Coding Lab); a chart builder, and the spreadsheet for
Excel and data-cleaning tasks (Data Analytics Lab; the Finance Lab has the
spreadsheet); a
design canvas (Creative and Design Studio); a project board, budget controls
and complications introduced mid-task (Business Simulation Lab); revision
history, presentations and audio or video (Communication Studio). Also
employer-sent assessment invitations and reports, and identity checks for
level B. The types and the lifecycle already allow for them.
