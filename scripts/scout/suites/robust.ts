import { formatBrief, type ScoutResult } from '../../../libs/scout/src/index'
import { scoutQuery, type ScoutQueryResult } from '../hook-core'
import type { Suite } from './types'

/** Проверка устойчивости: исключение внутри считается провалом */
export interface RobustCheck {
  name: string
  query: string
  check: (r: ScoutQueryResult) => boolean
}

export interface RobustResult {
  passed: number
  total: number
  failed: string[]
}

const SERVICE_COMMANDS = [
  'end-session',
  'deploy-agent',
  'sync-env',
  'forms-dev',
  'forms-coordinator',
  'ui-coordinator',
  'animatrona-coordinator',
  'webstudio',
  'letar',
  'repo',
]

function noNaN(r: ScoutResult): boolean {
  return [...r.docs, ...r.traps].every((d) => !Number.isNaN(d.score))
}

const STACK_LINE = 'at Object.<anonymous> (C:\\web\\letar\\apps\\x\\src\\y.ts:10:5)\n'
const LONG_PASTE = `форма заявки с телефоном клиента\n${
  STACK_LINE.repeat(Math.ceil(22_000 / STACK_LINE.length)).slice(0, 22_000)
}`

export const ROBUST_CHECKS: RobustCheck[] = [
  {
    name: 'constructor',
    query: 'constructor в классе стал undefined',
    check: (r) => Boolean(formatBrief(r.result)) && noNaN(r.result),
  },
  {
    name: 'proto-words',
    query: 'toString valueOf hasOwnProperty __proto__ в объекте конфига',
    check: (r) => noNaN(r.result),
  },
  {
    name: 'long-paste',
    query: LONG_PASTE,
    check: (r) => r.forms === 'dense' && r.result.fields.some((f) => f.name === 'Form.Field.Phone'),
  },
  {
    name: 'no-service-command',
    query: 'задеплой приложение на прод после правки',
    check: (r) => !r.result.tool || !SERVICE_COMMANDS.includes(r.result.tool.name),
  },
  {
    name: 'subdir-command',
    query: 'проведи аудит безопасности приложения по OWASP',
    check: (r) => r.result.tool?.name === 'audit:security-check' || r.result.tool?.name === 'security-auditor',
  },
  {
    name: 'pattern-only',
    query: 'нужна многошаговая форма-мастер оформления заказа',
    check: (r) => r.result.pattern?.name === 'multi-step',
  },
  {
    name: 'formula-not-form',
    query: 'пересчитай формулу сметы и сформируй итог',
    check: (r) => r.result.fields.length === 0,
  },
]

export const robustSuite: Suite = async ({ engine, home, deps, root }) => {
  console.log('\n== robust ==')
  const failed: string[] = []
  for (const c of ROBUST_CHECKS) {
    let ok = false
    try {
      ok = c.check(await scoutQuery(engine, home, c.query, deps, root))
    } catch {
      ok = false
    }
    console.log(`${ok ? '✓' : '✗'} ${c.name}`)
    if (!ok) {
      failed.push(c.name)
    }
  }
  const result: RobustResult = { passed: ROBUST_CHECKS.length - failed.length, total: ROBUST_CHECKS.length, failed }
  console.log(
    `прошли ${result.passed}/${result.total}${failed.length ? `; провал: ${failed.join(', ')}` : ''}`,
  )
  return { summary: { устойчивость: result.passed }, result }
}
