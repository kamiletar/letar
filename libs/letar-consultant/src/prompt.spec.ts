import { describe, expect, it } from 'vitest'
import { buildMessages } from './prompt.js'
import type { CodeChunk } from './retrieve.js'

const chunk: CodeChunk = {
  filePath: 'apps/kami/src/lib/db.ts',
  content: 'export function getEnhancedPrisma() {}',
  score: 0.87,
  startLine: 12,
}

describe('buildMessages', () => {
  it('возвращает системное и пользовательское сообщение', () => {
    const messages = buildMessages('где определён getEnhancedPrisma?', [chunk])

    expect(messages).toHaveLength(2)
    expect(messages[0]?.role).toBe('system')
    expect(messages[1]?.role).toBe('user')
  })

  it('включает базовые конвенции letar в системный промпт независимо от режима', () => {
    const [system] = buildMessages('вопрос', [])

    expect(system?.content).toContain('монорепо letar')
    expect(system?.content).toContain('ЗАПРЕЩЕНЫ export default')
    expect(system?.content).toContain('@letar/forms')
  })

  it('режим navigation добавляет инструкцию про файлы и строки', () => {
    const [system] = buildMessages('вопрос', [], 'navigation')

    expect(system?.content).toContain('Режим: навигация по коду')
  })

  it('режим architecture добавляет инструкцию про архитектурные решения', () => {
    const [system] = buildMessages('вопрос', [], 'architecture')

    expect(system?.content).toContain('Режим: архитектурные решения')
  })

  it('режим convention добавляет инструкцию про конвенции', () => {
    const [system] = buildMessages('вопрос', [], 'convention')

    expect(system?.content).toContain('Режим: конвенции')
  })

  it('режим auto не добавляет дополнительных инструкций', () => {
    const [systemAuto] = buildMessages('вопрос', [], 'auto')
    const [systemDefault] = buildMessages('вопрос', [])

    expect(systemAuto?.content).not.toContain('**Режим:')
    expect(systemAuto?.content).toBe(systemDefault?.content)
  })

  it('разные режимы дают разный итоговый системный промпт', () => {
    const [navigation] = buildMessages('вопрос', [], 'navigation')
    const [architecture] = buildMessages('вопрос', [], 'architecture')
    const [convention] = buildMessages('вопрос', [], 'convention')
    const [auto] = buildMessages('вопрос', [], 'auto')

    const contents = [navigation?.content, architecture?.content, convention?.content, auto?.content]
    expect(new Set(contents).size).toBe(4)
  })

  it('пустой контекст обрабатывается корректно — вставляется плейсхолдер', () => {
    const [, user] = buildMessages('вопрос без контекста', [])

    expect(user?.content).toContain('контекст из кодовой базы недоступен')
  })

  it('непустой контекст встраивается в пользовательское сообщение вместе с вопросом', () => {
    const [, user] = buildMessages('где getEnhancedPrisma?', [chunk])

    expect(user?.content).toContain('где getEnhancedPrisma?')
    expect(user?.content).toContain(chunk.filePath)
    expect(user?.content).toContain('## Контекст из кодовой базы letar')
    expect(user?.content).toContain('## Вопрос')
  })

  it('вопрос идёт после контекста в пользовательском сообщении', () => {
    const [, user] = buildMessages('мой вопрос', [chunk])
    const content = user?.content ?? ''

    const contextIndex = content.indexOf('## Контекст')
    const questionIndex = content.indexOf('## Вопрос')

    expect(contextIndex).toBeGreaterThanOrEqual(0)
    expect(questionIndex).toBeGreaterThan(contextIndex)
  })
})
