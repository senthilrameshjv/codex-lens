#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn, exec } = require('child_process')
const net = require('net')
const os = require('os')
const path = require('path')
const fs = require('fs')

const PKG_DIR = path.join(__dirname, '..')
const CACHE_DIR = path.join(os.homedir(), '.codex-lens')

function findFreePort(port = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => resolve(findFreePort(port + 1)))
    server.listen(port, () => server.close(() => resolve(port)))
  })
}

function openBrowser(url) {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32' ? `start "" "${url}"` :
    `xdg-open "${url}"`
  exec(cmd)
}

const SRC_DIRS = ['app', 'components', 'lib', 'types', 'public']
const SRC_FILES = ['next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'components.json']

function syncSource(pkg) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  for (const dir of SRC_DIRS) {
    const src = path.join(PKG_DIR, dir)
    if (fs.existsSync(src)) fs.cpSync(src, path.join(CACHE_DIR, dir), { recursive: true, force: true })
  }
  for (const file of SRC_FILES) {
    const src = path.join(PKG_DIR, file)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(CACHE_DIR, file))
  }
  fs.writeFileSync(path.join(CACHE_DIR, 'package.json'), JSON.stringify({
    name: 'codex-lens-runtime',
    version: pkg.version,
    dependencies: pkg.dependencies,
  }, null, 2))
}

async function main() {
  const pkg = require(path.join(PKG_DIR, 'package.json'))
  const versionFile = path.join(CACHE_DIR, '.codex-lens-version')
  const cachedVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, 'utf8').trim() : null
  const nextCli = path.join(CACHE_DIR, 'node_modules', 'next', 'dist', 'bin', 'next')
  const needsSetup = cachedVersion !== pkg.version || !fs.existsSync(nextCli)

  if (needsSetup) {
    syncSource(pkg)
    await new Promise((resolve, reject) => {
      const install = spawn('npm', ['install', '--prefer-offline', '--no-package-lock'], {
        cwd: CACHE_DIR,
        stdio: 'inherit',
        shell: true,
      })
      install.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed (exit ${code})`)))
    })
    fs.writeFileSync(versionFile, pkg.version)
  }

  const port = await findFreePort(3000)
  const url = `http://localhost:${port}`
  const child = spawn(process.execPath, [nextCli, 'dev', '--port', String(port)], {
    cwd: CACHE_DIR,
    stdio: [process.platform === 'win32' ? 'ignore' : 'inherit', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
  })

  let opened = false
  function checkReady(text) {
    if (!opened && /Local:|ready|started server/i.test(text)) {
      opened = true
      openBrowser(url)
    }
  }

  child.stdout.on('data', (data) => { process.stdout.write(data); checkReady(data.toString()) })
  child.stderr.on('data', (data) => { process.stderr.write(data); checkReady(data.toString()) })
  child.on('exit', (code) => process.exit(code ?? 0))
  process.on('SIGINT', () => { child.kill(); process.exit(0) })
  process.on('SIGTERM', () => { child.kill(); process.exit(0) })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
