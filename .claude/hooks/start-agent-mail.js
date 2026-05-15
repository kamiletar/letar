#!/usr/bin/env node
/**
 * SessionStart хук — автозапуск MCP Agent Mail через Docker.
 *
 * 1. Проверяет порт 8765
 * 2. Если порт занят — проверяет health endpoint
 * 3. Если health не отвечает — перезапускает Docker контейнер
 * 4. Если Docker не установлен — пропускает молча
 */

const { execFileSync } = require('child_process')
const path = require('path')
const net = require('net')
const http = require('http')

const PORT = 8765
const COMPOSE_DIR = path.resolve(__dirname, '../../infra/agent-mail/mcp_agent_mail')
const HEALTH_TIMEOUT_MS = 3000

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(500)
    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.on('error', () => {
      resolve(false)
    })
    socket.connect(port, '127.0.0.1')
  })
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/health/liveness`, { timeout: HEALTH_TIMEOUT_MS }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

function dockerComposeUp() {
  try {
    execFileSync('docker', ['compose', 'up', '-d'], {
      cwd: COMPOSE_DIR,
      timeout: 120000,
      stdio: 'pipe',
    })
    console.error(`Agent Mail: Docker контейнер запущен на порту ${PORT}`)
    return true
  } catch (e) {
    console.error(`Agent Mail: не удалось запустить Docker — ${e.message}`)
    return false
  }
}

function dockerComposeRestart() {
  try {
    execFileSync('docker', ['compose', 'restart', 'server'], {
      cwd: COMPOSE_DIR,
      timeout: 30000,
      stdio: 'pipe',
    })
    console.error('Agent Mail: Docker контейнер перезапущен')
    return true
  } catch (e) {
    console.error(`Agent Mail: не удалось перезапустить — ${e.message}`)
    return false
  }
}

function isDockerAvailable() {
  try {
    execFileSync('docker', ['info'], { timeout: 5000, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!isDockerAvailable()) {
    process.exit(0)
  }

  const portInUse = await checkPort(PORT)

  if (portInUse) {
    const healthy = await checkHealth()
    if (healthy) {
      process.exit(0)
    }

    // Сервер завис — перезапускаем контейнер
    console.error('Agent Mail: сервер не отвечает на health check, перезапускаю...')
    dockerComposeRestart()
  } else {
    // Порт свободен — запускаем
    dockerComposeUp()
  }

  process.exit(0)
}

main()
