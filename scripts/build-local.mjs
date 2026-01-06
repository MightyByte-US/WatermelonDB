#!/usr/bin/env node

/**
 * Build script that creates a versioned .tgz package in the builds/ folder
 * Usage: node scripts/build-local.mjs [version-suffix]
 *
 * Examples:
 *   node scripts/build-local.mjs           -> builds/nozbe-watermelondb-v0.28.1-0.tgz
 *   node scripts/build-local.mjs dev       -> builds/nozbe-watermelondb-v0.28.1-0-dev.tgz
 *   node scripts/build-local.mjs feature-x -> builds/nozbe-watermelondb-v0.28.1-0-feature-x.tgz
 */

import { execa } from 'execa'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

import pkg from './pkg.cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distPath = path.join(rootDir, 'dist')
const buildsPath = path.join(rootDir, 'builds')

const suffix = process.argv[2] || ''
const versionTag = suffix ? `v${pkg.version}-${suffix}` : `v${pkg.version}`
const tgzName = `nozbe-watermelondb-${versionTag}.tgz`
const tgzPath = path.join(buildsPath, tgzName)

async function main() {
  console.log(`Building WatermelonDB v${pkg.version}...`)

  // Run the standard build
  await execa('yarn', ['build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  })

  // Ensure builds directory exists
  await fs.ensureDir(buildsPath)

  // Pack the dist folder into a tgz
  console.log(`\nPacking to ${tgzName}...`)
  await execa('yarn', ['pack', '--filename', tgzPath], {
    cwd: distPath,
    stdio: 'inherit'
  })

  console.log(`\n✅ Build complete: builds/${tgzName}`)
  console.log(`\nTo use in another project, add to package.json:`)
  console.log(`  "@nozbe/watermelondb": "file:${tgzPath}"`)
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
