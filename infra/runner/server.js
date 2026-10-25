#!/usr/bin/env node
/**
 * Nexus runner: a small code runner that speaks the part of Judge0's API
 * Nexus uses, so the app talks to it exactly as to Judge0 (JUDGE0_URL and
 * JUDGE0_AUTH_TOKEN). Unlike Judge0 it runs on ARM as well as x86, so it fits
 * Oracle Cloud's free Ampere tier.
 *
 * Every run is a fresh, throwaway container from a pinned image, under the
 * gVisor runtime (runsc) when available: no network, read-only filesystem,
 * no capabilities, an unprivileged user, and caps on memory, processes, file
 * size and time. Candidate code arrives on stdin and never touches disk.
 *
 * Needs Node 18+ and Docker. No npm dependencies. Configuration comes from
 * the environment (see infra/runner/README.md).
 */
'use strict'

const http = require('node:http')
const crypto = require('node:crypto')
const os = require('node:os')
const { spawn, execFile } = require('node:child_process')

const VERSION = '1.0.0'
const MAX_BODY_BYTES = 1024 * 1024
const MAX_OUTPUT_BYTES = 1024 * 1024
/** Upper bounds on what any caller may ask for. */
const CEILING = { wallSeconds: 10, memoryKb: 512000 }
/** Container start-up time, on top of the program's own wall-clock limit. */
const STARTUP_ALLOWANCE_MS = 5000

const STATUS = {
  accepted: { id: 3, description: 'Accepted' },
  timeLimit: { id: 5, description: 'Time Limit Exceeded' },
  runtimeError: { id: 11, description: 'Runtime Error (NZEC)' },
  memory: { id: 12, description: 'Runtime Error (out of memory)' },
  output: { id: 12, description: 'Runtime Error (output limit exceeded)' },
  internal: { id: 13, description: 'Internal Error' },
}

function readConfig(env = process.env) {
  return {
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT || 2358),
    token: env.RUNNER_TOKEN || '',
    runtime: env.RUNNER_RUNTIME || 'runsc',
    docker: env.RUNNER_DOCKER || 'docker',
    pythonImage: env.RUNNER_PYTHON_IMAGE || 'python:3.12.7-slim',
    nodeImage: env.RUNNER_NODE_IMAGE || 'node:22.11.0-slim',
    concurrency: Math.max(1, Number(env.RUNNER_CONCURRENCY) || os.cpus().length),
    queueLimit: Math.max(1, Number(env.RUNNER_QUEUE_LIMIT) || 50),
  }
}

const versionOf = (image) => (/:(\d+(?:\.\d+)*)/.exec(image) || [])[1] || 'unknown'

/** Names follow Judge0's ("Python (3.12.7)") so Nexus detects them the same way. */
function languagesFor(config) {
  return [
    {
      id: 1,
      name: `Python (${versionOf(config.pythonImage)})`,
      image: config.pythonImage,
      command: ['python3', '-I', '-'],
    },
    {
      id: 2,
      name: `JavaScript (Node.js ${versionOf(config.nodeImage)})`,
      image: config.nodeImage,
      command: ['node', '-'],
    },
  ]
}

/**
 * Runs one program in a fresh container and reports Judge0-style status.
 * Resolves with { stdout, stderr, status }; never rejects.
 */
function dockerExecutor(config) {
  return (language, source, limits) =>
    new Promise((resolve) => {
      const name = `nexus-run-${crypto.randomBytes(8).toString('hex')}`
      const memoryMb = Math.max(32, Math.floor(limits.memoryKb / 1024))
      const args = [
        'run',
        '--rm',
        '-i',
        '--pull',
        'never',
        '--name',
        name,
        ...(config.runtime && config.runtime !== 'runc' ? ['--runtime', config.runtime] : []),
        '--network',
        'none',
        '--read-only',
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,size=16m',
        '--memory',
        `${memoryMb}m`,
        '--memory-swap',
        `${memoryMb}m`,
        '--cpus',
        '1',
        '--pids-limit',
        '64',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--user',
        '65534:65534',
        '--ulimit',
        'fsize=1048576',
        '--ulimit',
        'nofile=128:128',
        '--env',
        'HOME=/tmp',
        '--env',
        'PYTHONDONTWRITEBYTECODE=1',
        language.image,
        ...language.command,
      ]
      const child = spawn(config.docker, args, { stdio: ['pipe', 'pipe', 'pipe'] })
      const out = { stdout: [], stderr: [], bytes: 0 }
      let timedOut = false
      let overflow = false
      const stop = () => execFile(config.docker, ['kill', name], () => undefined)
      const timer = setTimeout(
        () => {
          timedOut = true
          stop()
        },
        limits.wallSeconds * 1000 + STARTUP_ALLOWANCE_MS
      )
      const collect = (stream) => (chunk) => {
        out.bytes += chunk.length
        if (out.bytes > MAX_OUTPUT_BYTES) {
          if (!overflow) {
            overflow = true
            stop()
          }
          return
        }
        out[stream].push(chunk)
      }
      child.stdout.on('data', collect('stdout'))
      child.stderr.on('data', collect('stderr'))
      child.stdin.on('error', () => undefined)
      child.stdin.end(source)
      child.on('error', (error) => {
        clearTimeout(timer)
        resolve({ stdout: '', stderr: String(error.message), status: STATUS.internal })
      })
      child.on('close', (code) => {
        clearTimeout(timer)
        const stdout = Buffer.concat(out.stdout).toString('utf8')
        const stderr = Buffer.concat(out.stderr).toString('utf8')
        let status = STATUS.accepted
        if (timedOut) status = STATUS.timeLimit
        else if (overflow) status = STATUS.output
        // 125-127: Docker itself failed (daemon, runtime, missing image).
        else if (code >= 125 && code <= 127) status = STATUS.internal
        else if (code === 137) status = STATUS.memory
        else if (code !== 0) status = STATUS.runtimeError
        resolve({ stdout, stderr, status })
      })
    })
}

/** At most `concurrency` runs at once; at most `queueLimit` waiting. */
function createQueue(concurrency, queueLimit) {
  let active = 0
  const waiting = []
  const next = () => {
    if (active >= concurrency || waiting.length === 0) return
    active += 1
    const { task, resolve } = waiting.shift()
    task()
      .then(resolve)
      .finally(() => {
        active -= 1
        next()
      })
  }
  return {
    full: () => waiting.length >= queueLimit,
    push: (task) =>
      new Promise((resolve) => {
        waiting.push({ task, resolve })
        next()
      }),
  }
}

function sameToken(given, expected) {
  const a = Buffer.from(String(given || ''))
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

const clamp = (value, low, high, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.min(high, Math.max(low, n)) : fallback
}

/**
 * The HTTP server. `execute` is injectable so tests can run without Docker.
 */
function createRunnerServer(options = {}) {
  const config = { ...readConfig(), ...options.config }
  if (!config.token) throw new Error('RUNNER_TOKEN is required')
  const languages = languagesFor(config)
  const execute = options.execute || dockerExecutor(config)
  const queue = createQueue(config.concurrency, config.queueLimit)
  let served = 0

  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify(body))
  }

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://runner')
      if (!sameToken(req.headers['x-auth-token'], config.token)) {
        return send(res, 401, { error: 'Unauthorized' })
      }
      if (req.method === 'GET' && url.pathname === '/about') {
        return send(res, 200, { name: 'Nexus runner', version: VERSION, runs: served })
      }
      if (req.method === 'GET' && url.pathname === '/languages') {
        return send(
          res,
          200,
          languages.map(({ id, name }) => ({ id, name }))
        )
      }
      if (req.method === 'POST' && url.pathname === '/submissions') {
        const body = JSON.parse(await readBody(req))
        const base64 = url.searchParams.get('base64_encoded') === 'true'
        const language = languages.find((l) => l.id === Number(body.language_id))
        if (!language) return send(res, 422, { error: 'Unknown language_id' })
        if (body.enable_network) return send(res, 422, { error: 'Network access is not available' })
        if (typeof body.source_code !== 'string')
          return send(res, 422, { error: 'source_code is required' })
        if (queue.full()) return send(res, 503, { error: 'Queue is full' })
        const source = base64
          ? Buffer.from(body.source_code, 'base64').toString('utf8')
          : body.source_code
        const limits = {
          wallSeconds: clamp(body.wall_time_limit, 1, CEILING.wallSeconds, 5),
          memoryKb: clamp(body.memory_limit, 32000, CEILING.memoryKb, 128000),
        }
        const result = await queue.push(() => execute(language, source, limits))
        served += 1
        const encode = (text) => (base64 ? Buffer.from(text, 'utf8').toString('base64') : text)
        return send(res, 201, {
          token: crypto.randomUUID(),
          stdout: encode(result.stdout),
          stderr: encode(result.stderr),
          compile_output: null,
          message: null,
          status: result.status,
        })
      }
      return send(res, 404, { error: 'Not found' })
    } catch (error) {
      const statusCode = (error && error.statusCode) || (error instanceof SyntaxError ? 400 : 500)
      return send(res, statusCode, { error: statusCode === 500 ? 'Runner error' : error.message })
    }
  })
}

function main() {
  const config = readConfig()
  const server = createRunnerServer({ config })
  server.listen(config.port, config.host, () => {
    console.log(
      `Nexus runner ${VERSION} on ${config.host}:${config.port}, runtime ${config.runtime}, ` +
        `${config.concurrency} at a time`
    )
  })
  const shutdown = () => server.close(() => process.exit(0))
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

if (require.main === module) main()

module.exports = { createRunnerServer, languagesFor, readConfig, STATUS, VERSION }
