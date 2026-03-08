#!/usr/bin/env node
/**
 * Removes Windows user folders (My Pictures, My Music, My Videos) from project root.
 * These are junctions/symlinks on Windows that break Vercel builds (ENOENT on Linux).
 * Safe to run - only removes these specific folders if they exist.
 */
const fs = require('fs')
const path = require('path')

const dirs = ['My Music', 'My Pictures', 'My Videos']
const root = process.cwd()

for (const dir of dirs) {
  const fullPath = path.join(root, dir)
  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true })
      console.log(`Removed: ${dir}`)
    }
  } catch (e) {
    // Ignore - folder may not exist or be inaccessible
  }
}
