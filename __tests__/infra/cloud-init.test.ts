/**
 * @jest-environment node
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

const { buildCloudInit, MAX_BYTES } = require('../../infra/runner/build-cloud-init.js')

const dir = path.join(process.cwd(), 'infra', 'runner')
const read = (name: string) => readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n')

describe('Oracle cloud-init script', () => {
  const script: string = buildCloudInit(dir)

  it('is up to date with server.js and setup.sh (run build-cloud-init.js)', () => {
    expect(read('oracle-cloud-init.sh')).toBe(script)
  })

  it('carries both files unchanged', () => {
    const bodies = [...script.matchAll(/<<'NEXUS_RUNNER_EOF'\n([\s\S]*?)\nNEXUS_RUNNER_EOF/g)].map(
      (m) => m[1]
    )
    expect(bodies).toEqual([read('server.js').trimEnd(), read('setup.sh').trimEnd()])
  })

  it('fits Oracle’s user-data limit and leaves the two settings to fill in', () => {
    expect(Buffer.byteLength(script)).toBeLessThan(MAX_BYTES)
    expect(script).toContain('RUNNER_DOMAIN="CHANGE-ME.duckdns.org"')
    expect(script).toContain('RUNNER_TOKEN="CHANGE-ME"')
  })
})
