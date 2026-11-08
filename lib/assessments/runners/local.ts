/**
 * Where candidate code may run. In production every program (Python,
 * JavaScript, TypeScript and SQL) goes to the external code runner, on its
 * own server. The in-process sandboxes (QuickJS, sql.js, Pyodide) exist for
 * local development and tests only, and refuse to run in production.
 */

export function localSandboxesAllowed(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export const LOCAL_ONLY_MESSAGE =
  'Candidate code never runs on the app server in production. Set up the code runner.'
