#!/usr/bin/env node
/**
 * Обёртка для @modelcontextprotocol/server-postgres.
 * Читает connection string из .env файла — пароли не хранятся в .mcp.json.
 *
 * Использование:
 *   node pg-wrapper.mjs <env-file> [url-var] [--tunnel <local-port> <ssh-host> <remote-port>]
 *
 * Примеры:
 *   node pg-wrapper.mjs apps/kami/.env.local
 *   node pg-wrapper.mjs apps/kami/.env.local DATABASE_URL
 *   node pg-wrapper.mjs apps/kami/.env.docker MCP_PROD_RO_URL --tunnel 5455 root@s2.letar.best 5437
 */

import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { createConnection } from 'net'
import { resolve } from 'path'

function parseEnv(filePath) {
  const content = readFileSync(resolve(filePath), 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const conn = createConnection({ port, host: '127.0.0.1' })
    conn.once('connect', () => {
      conn.destroy()
      resolve(true)
    })
    conn.once('error', () => resolve(false))
    conn.setTimeout(1000, () => {
      conn.destroy()
      resolve(false)
    })
  })
}

async function waitForPort(port, timeout = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await isPortOpen(port)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function main() {
  const args = process.argv.slice(2)

  const envFile = args[0]
  if (!envFile) {
    console.error('Usage: pg-wrapper.mjs <env-file> [url-var] [--tunnel <local-port> <ssh-host> <remote-port>]')
    process.exit(1)
  }

  const urlVar = args[1] && !args[1].startsWith('--') ? args[1] : 'DATABASE_URL'

  let tunnelLocalPort, tunnelSshHost, tunnelRemotePort
  const tunnelIdx = args.indexOf('--tunnel')
  if (tunnelIdx !== -1) {
    tunnelLocalPort = parseInt(args[tunnelIdx + 1])
    tunnelSshHost = args[tunnelIdx + 2]
    tunnelRemotePort = parseInt(args[tunnelIdx + 3])
  }

  const env = parseEnv(envFile)
  const dbUrl = env[urlVar]

  if (!dbUrl) {
    console.error(`Переменная ${urlVar} не найдена в ${envFile}`)
    process.exit(1)
  }

  if (tunnelLocalPort && tunnelSshHost && tunnelRemotePort) {
    if (!(await isPortOpen(tunnelLocalPort))) {
      const sshExe = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe'
      const sshKey = `${process.env.USERPROFILE}\\.ssh\\id_rsa`

      spawn(
        sshExe,
        [
          '-i',
          sshKey,
          '-o',
          'StrictHostKeyChecking=no',
          '-o',
          'ServerAliveInterval=30',
          '-L',
          `${tunnelLocalPort}:localhost:${tunnelRemotePort}`,
          '-N',
          tunnelSshHost,
        ],
        { detached: true, stdio: 'ignore' },
      ).unref()

      const ok = await waitForPort(tunnelLocalPort)
      if (!ok) {
        console.error(`SSH туннель не поднялся за 20 сек (порт ${tunnelLocalPort})`)
        process.exit(1)
      }
    }
  }

  const mcp = spawn('bunx', ['@modelcontextprotocol/server-postgres', dbUrl], { stdio: 'inherit' })
  mcp.on('exit', (code) => process.exit(code ?? 0))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
