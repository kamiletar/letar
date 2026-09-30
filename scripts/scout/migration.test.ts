import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Bm25, buildIndex, collectCards, scout } from '../../libs/scout/src/index'
import { appendLog, scoutVersion } from './hook-core'
import { sourcesMtime } from './index-store'
import { mineSession } from './mine-transcripts'
import { versionBreakdown } from './report'
import { canonicalTool, canonicalTools } from './tool-names'

describe('скилы после миграции инструкций', () => {
  /** Синтетический репозиторий: источник скилов `.agents/skills`, производная копия `.claude/skills` */
  function skillRepo() {
    const root = mkdtempSync(join(tmpdir(), 'scout-skills-'))
    mkdirSync(join(root, '.claude', 'docs'), { recursive: true })
    writeFileSync(join(root, 'nx.json'), '{}')
    mkdirSync(join(root, 'apps', 'app-a'), { recursive: true })
    const skill = (base: string, name: string, front: string) => {
      mkdirSync(join(root, base, name), { recursive: true })
      writeFileSync(join(root, base, name, 'SKILL.md'), `---\nname: ${name}\n${front}\n---\n# ${name}\n`)
    }
    for (const base of ['.agents/skills', '.claude/skills']) {
      skill(base, 'app-a', 'description: воркфлоу приложения a')
      skill(base, 'tool-x', 'description: полезный инструмент x')
      skill(base, 'end-session', 'description: завершение сессии')
      skill(base, 'old-one', 'description: Устарел, не использовать')
      skill(base, 'manual-only', 'description: только вручную\ndisable-model-invocation: true')
    }
    return root
  }

  it('scope: приложение, служебный, устарел, disable-model-invocation; обычный без scope', () => {
    const cards = collectCards(skillRepo()).filter((c) => c.kind === 'skill')
    const scope = Object.fromEntries(cards.map((c) => [c.title, c.scope]))
    expect(scope).toEqual({
      'app-a': 'app',
      'tool-x': undefined,
      'end-session': 'service',
      'old-one': 'service',
      'manual-only': 'user-only',
    })
  })

  it('.claude/skills не индексируется: дублей карточек нет', () => {
    const cards = collectCards(skillRepo()).filter((c) => c.kind === 'skill')
    expect(cards.length).toBe(5)
    expect(cards.every((c) => c.path.startsWith('.agents/skills/'))).toBe(true)
  })

  it('совет: скил приложения, служебный и user-only не попадают в tool', () => {
    const engine = new Bm25(buildIndex(collectCards(skillRepo())))
    for (const query of ['воркфлоу приложения a', 'только вручную', 'завершение сессии']) {
      expect(scout(engine, query).tool, query).toBeUndefined()
    }
    expect(scout(engine, 'полезный инструмент x').tool?.name).toBe('tool-x')
  })

  it('свежесть: правка SKILL.md и AGENTS.md сдвигает sourcesMtime (индекс пересоберётся)', () => {
    const root = skillRepo()
    const old = new Date('2026-01-01T00:00:00Z')
    const skills = join(root, '.agents/skills')
    const target = join(skills, 'tool-x', 'SKILL.md')
    const reset = () => {
      for (const name of readdirSync(skills)) {
        utimesSync(join(skills, name, 'SKILL.md'), old, old)
      }
      utimesSync(skills, old, old)
      utimesSync(join(root, '.claude', 'docs'), old, old)
    }
    reset()
    const before = sourcesMtime(root)
    expect(before).toBeLessThan(Date.now() - 1000 * 60 * 60 * 24 * 30)
    writeFileSync(target, `${readFileSync(target, 'utf8')}правка\n`)
    expect(sourcesMtime(root)).toBeGreaterThan(before)
    reset()
    expect(sourcesMtime(root)).toBeLessThan(Date.now() - 1000 * 60 * 60 * 24 * 30)
    writeFileSync(join(root, 'AGENTS.md'), '# карта\n')
    expect(sourcesMtime(root)).toBe(statSync(join(root, 'AGENTS.md')).mtimeMs)
  })
})

describe('таблица соответствий имён инструментов', () => {
  it('переименование, слияние и удалённые пункты', () => {
    expect(canonicalTool('infra:deploy')).toBe('infra-deploy')
    expect(canonicalTool('form-generator')).toBe('form-pipeline')
    expect(canonicalTool('deployment-assistant')).toBeNull()
    expect(canonicalTool('form-pipeline')).toBe('form-pipeline')
    expect(canonicalTool('toString')).toBe('toString')
  })

  it('canonicalTools: удалённые пропадают, повторы схлопываются', () => {
    expect(canonicalTools(['workflow:debug', 'create:new-app', 'create-new-app'])).toEqual(['create-new-app'])
  })
})

describe('версия скаута в логе', () => {
  it('scoutVersion стабильна в процессе и пишется в каждую строку лога', () => {
    expect(scoutVersion()).toMatch(/^\d+-[0-9a-f]{8}$/)
    expect(scoutVersion()).toBe(scoutVersion())
    const home = mkdtempSync(join(tmpdir(), 'scout-home-'))
    appendLog(home, { sessionId: 's', ts: new Date().toISOString() })
    const row = JSON.parse(readFileSync(join(home, 'logs', 'briefs.jsonl'), 'utf8').trim())
    expect(row.scoutVersion).toBe(scoutVersion())
  })

  it('versionBreakdown делит справки по версиям, строки без поля — «без версии»', () => {
    const rows = [
      { sessionId: 'a', scoutVersion: '5-aaaa' },
      { sessionId: 'b', scoutVersion: '5-aaaa' },
      { sessionId: 'c' },
    ]
    expect(versionBreakdown(rows)).toEqual([
      { version: '5-aaaa', count: 2 },
      { version: 'без версии', count: 1 },
    ])
  })
})

describe('mine-transcripts: вызов скила приложения как команды', () => {
  it('/<app> с аргументами — задача и команда; Skill-вызов попадает в skills', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'scout-mine-'))
    const file = join(dir, 's.jsonl')
    const rows = [
      {
        type: 'user',
        origin: { kind: 'human' },
        sessionId: 's2',
        timestamp: '2026-09-30T00:00:00Z',
        cwd: 'C:\\repo',
        message: {
          content:
            '<command-message>app-a</command-message>\n<command-name>/app-a</command-name>\n<command-args>поправь кнопку входа</command-args>',
        },
      },
      {
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: 'create-new-app' } }] },
      },
    ]
    writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n'))
    const rec = await mineSession(file)
    expect(rec).toMatchObject({
      task: 'поправь кнопку входа',
      command: 'app-a',
      commands: ['app-a'],
      skills: ['create-new-app'],
    })
  })
})
