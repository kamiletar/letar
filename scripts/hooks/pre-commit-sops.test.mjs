#!/usr/bin/env bun
// Тесты pre-commit-sops.sh — запускать `bun test scripts/hooks/pre-commit-sops.test.mjs`.
//
// Хук зовёт настоящий sops и age-ключ, а age-keygen на машинах агентов нет. Поэтому в PATH
// подкладывается фальшивый `sops`: «расшифровка» — cat, «шифрование» — копирование. Проверяется
// именно логика хука (сверка имён ключей, флаг обхода, git add), не криптография.

import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOOK_PATH = fileURLToPath(new URL('./pre-commit-sops.sh', import.meta.url))
const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

const FAKE_SOPS = `#!/usr/bin/env bash
mode=""; out=""; file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --decrypt) mode=dec ;;
    --encrypt) mode=enc ;;
    --output) out="$2"; shift ;;
    --input-type|--output-type) shift ;;
    *) file="$1" ;;
  esac
  shift
done
if [[ "$mode" == dec ]]; then cat "$file"; else cp "$file" "$out"; fi
`

function run(cmd, cwd, env = {}) {
  const r = Bun.spawnSync(cmd, { cwd, stdout: 'pipe', stderr: 'pipe', env: { ...process.env, ...env } })
  return { code: r.exitCode, out: r.stdout.toString('utf8'), err: r.stderr.toString('utf8') }
}

/** Временный git-репо с apps/demo/.env.docker(.enc): enc — прод-версия, plain — локальная копия. */
function setup({ enc, plain }) {
  const dir = mkdtempSync(join(tmpdir(), 'sops-hook-test-'))
  tempDirs.push(dir)
  run(['git', 'init', '-q'], dir)
  mkdirSync(join(dir, 'apps/demo'), { recursive: true })
  mkdirSync(join(dir, 'bin'))
  writeFileSync(join(dir, 'bin/sops'), FAKE_SOPS)
  chmodSync(join(dir, 'bin/sops'), 0o755)
  writeFileSync(join(dir, 'key.txt'), 'fake-age-key')
  writeFileSync(join(dir, 'apps/demo/.env.docker.enc'), enc)
  writeFileSync(join(dir, 'apps/demo/.env.docker'), plain)
  // plain новее .enc — условие срабатывания хука
  const old = new Date(Date.now() - 60_000)
  utimesSync(join(dir, 'apps/demo/.env.docker.enc'), old, old)
  return dir
}

function runHook(dir, extraEnv = {}) {
  const bin = join(dir, 'bin').replaceAll(String.fromCharCode(92), '/')
  return run(['bash', HOOK_PATH], dir, {
    PATH: `${bin}:${process.env.PATH}`,
    SOPS_AGE_KEY_FILE: join(dir, 'key.txt'),
    ...extraEnv,
  })
}

const readEnc = (dir) => readFileSync(join(dir, 'apps/demo/.env.docker.enc'), 'utf8')

describe('pre-commit-sops: сверка ключей', () => {
  test('ключ пропал из plain — коммит блокируется, .enc не тронут, значения не печатаются', () => {
    const dir = setup({ enc: 'A=1\nSECRET_B=very-secret-value\n', plain: 'A=1\n' })
    const r = runHook(dir)
    expect(r.code).toBe(1)
    expect(r.err).toContain('SECRET_B')
    expect(r.out + r.err).not.toContain('very-secret-value')
    expect(readEnc(dir)).toBe('A=1\nSECRET_B=very-secret-value\n')
  })

  test('блок одного файла — корректный сосед тоже не перешифрован и не застейджен', () => {
    // Иначе при блоке сосед уже перезаписан и в индексе — уезжает в следующий, посторонний коммит
    const dir = setup({ enc: 'A=1\nB=2\n', plain: 'A=1\n' })
    mkdirSync(join(dir, 'apps/ok'))
    writeFileSync(join(dir, 'apps/ok/.env.docker.enc'), 'X=1\n')
    writeFileSync(join(dir, 'apps/ok/.env.docker'), 'X=1\nY=2\n')
    const old = new Date(Date.now() - 60_000)
    utimesSync(join(dir, 'apps/ok/.env.docker.enc'), old, old)
    const r = runHook(dir)
    expect(r.code).toBe(1)
    expect(readFileSync(join(dir, 'apps/ok/.env.docker.enc'), 'utf8')).toBe('X=1\n')
    expect(run(['git', 'diff', '--cached', '--name-only'], dir).out).toBe('')
  })

  test('ключ добавлен — шифрует и делает git add', () => {
    const dir = setup({ enc: 'A=1\n', plain: 'A=1\nB=2\n' })
    const r = runHook(dir)
    expect(r.code).toBe(0)
    expect(readEnc(dir)).toBe('A=1\nB=2\n')
    expect(run(['git', 'diff', '--cached', '--name-only'], dir).out).toContain('apps/demo/.env.docker.enc')
  })

  test('изменено только значение — шифрует (набор ключей тот же)', () => {
    const dir = setup({ enc: 'A=1\nB=2\n', plain: 'A=1\nB=3\n' })
    expect(runHook(dir).code).toBe(0)
    expect(readEnc(dir)).toBe('A=1\nB=3\n')
  })

  test('GIT_ALLOW_SOPS_KEY_REMOVAL=1 — осознанное удаление ключа проходит', () => {
    const dir = setup({ enc: 'A=1\nB=2\n', plain: 'A=1\n' })
    const r = runHook(dir, { GIT_ALLOW_SOPS_KEY_REMOVAL: '1' })
    expect(r.code).toBe(0)
    expect(readEnc(dir)).toBe('A=1\n')
  })

  test('нет SOPS_AGE_KEY_FILE — хук молча выходит с 0 и ничего не шифрует', () => {
    const dir = setup({ enc: 'A=1\nB=2\n', plain: 'A=1\n' })
    const r = runHook(dir, { SOPS_AGE_KEY_FILE: '' })
    expect(r.code).toBe(0)
    expect(readEnc(dir)).toBe('A=1\nB=2\n')
  })
})
