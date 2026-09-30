import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { arg } from '../cli'
import { indexPath } from '../index-store'
import type { Suite } from './types'
import { percentile } from './util'

export interface HookResult {
  runs: number
  p50: number
  max: number
  ok: boolean
  problems: string[]
}

/** Настоящий хук отдельным процессом: время целиком, код выхода, валидность stdout */
async function runHook(root: string, home: string, runs: number, noPhrases = false): Promise<HookResult> {
  const tmp = mkdtempSync(join(tmpdir(), 'scout-bench-'))
  const times: number[] = []
  const problems: string[] = []
  try {
    const files = [basename(indexPath(home, root)), 'vectors.json', 'vectors.f32']
    if (!noPhrases) {
      files.push('phrase-vectors.json', 'phrase-vectors.f32')
    }
    for (const f of files) {
      if (existsSync(join(home, f))) {
        copyFileSync(join(home, f), join(tmp, f))
      }
    }
    for (let i = 0; i < runs; i++) {
      const payload = JSON.stringify({
        session_id: `bench-${Date.now()}-${i}`,
        prompt: 'сделай форму заявки: имя, телефон клиента и email',
        cwd: root,
      })
      const started = performance.now()
      const proc = Bun.spawn(['bun', join(root, '.claude', 'hooks', 'scout-brief.ts')], {
        cwd: root,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, SCOUT_HOME: tmp, SCOUT_MODE: 'on', ...(noPhrases ? { SCOUT_NO_PHRASES: '1' } : {}) },
      })
      proc.stdin.write(payload)
      await proc.stdin.end()
      const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
      times.push(performance.now() - started)
      if (code !== 0) {
        problems.push(`запуск ${i}: код выхода ${code}`)
      }
      if (out.trim()) {
        try {
          JSON.parse(out)
        } catch {
          problems.push(`запуск ${i}: stdout не JSON`)
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  const sorted = [...times].sort((a, b) => a - b)
  return { runs, p50: percentile(sorted, 0.5), max: sorted.at(-1) ?? 0, ok: problems.length === 0, problems }
}

export const hookSuite: Suite = async ({ root, home, flags }) => {
  const runs = Number(arg('--hook-runs') ?? 5)
  console.log('\n== hook ==')
  const hook = await runHook(root, home, runs, flags.noPhrases)
  console.log(
    `${hook.runs} запусков процесса: p50 ${Math.round(hook.p50)} мс, max ${Math.round(hook.max)} мс, ${
      hook.ok ? 'код 0 и stdout валиден' : `проблемы: ${hook.problems.join('; ')}`
    }`,
  )
  return { summary: { 'хук p50 мс': hook.p50, 'хук max мс': hook.max }, result: hook }
}
