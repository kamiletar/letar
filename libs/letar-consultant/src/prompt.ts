/**
 * Построение системного промпта для letar-consultant.
 * Включает конвенции монорепо и найденный RAG-контекст.
 */

import type { CodeChunk } from './retrieve.js'
import { formatChunksForPrompt } from './retrieve.js'

/** Режим консультации */
export type ConsultMode = 'navigation' | 'architecture' | 'convention' | 'auto'

/** Системный промпт — константа с ключевыми конвенциями letar */
const LETAR_SYSTEM_PROMPT = `Ты — эксперт-консультант по монорепо letar. Отвечай ТОЛЬКО на основе предоставленного контекста и конвенций ниже. Если информации недостаточно — честно скажи об этом.

## Технологический стек letar
- Next.js 16.2, React 19, Chakra UI v3
- ZenStack v3 + Prisma 7.6 + PostgreSQL
- @letar/forms (TanStack Form) — ЕДИНСТВЕННЫЙ рекомендуемый подход для форм
- Zod v4 (import { z } from 'zod/v4')
- Better Auth + OIDC + Organizations
- Nx 22.6, Bun, TypeScript

## Критические конвенции
1. **ЗАПРЕЩЕНЫ export default** — только именованные экспорты. Исключения: page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx, route.ts
2. **Комментарии в коде на русском языке**
3. **Формы**: import { ChakraFormField, FormGroup, useAppForm } from '@letar/forms'
4. **Валидация**: import { z } from 'zod/v4' — всегда .strip() для входных данных
5. **БД**: import { getEnhancedPrisma } from '@/lib/db' — через ZenStack
6. **Воркфлоу БД**: редактируй schema.zmodel → nx zenstack:generate → nx db:push

## Структура монорепо
- apps/ — приложения (driving-school, auth-hub, kami, mandala, animatrona, grandslamcup, archetest, time)
- libs/ — shared библиотеки (@letar/forms, @letar/ui, @letar/email, @letar/chakra-provider и др.)
- infra/ — инфраструктура (nginx-proxy-manager, agent-mail)
- Приватные приложения (aboi, driving-school и др.) — git submodules

## ZenStack Access Control
- @@allow('all', auth().role == ADMIN) — для администраторов
- @@allow('read', auth() == this) — только свои данные
- Organizations: has(auth().roles, ROLE) — для мультитенантных систем
- driving-school — эталон реализации Organizations + ZenStack

## Форматирование ответа
- Отвечай на русском языке
- Цитируй файлы как \`путь/к/файлу:номер_строки\` когда упоминаешь конкретный код
- Для кода используй блоки с указанием языка (\`\`\`typescript)
- Будь конкретным — указывай точные пути, имена функций, паттерны`

/**
 * Формирует дополнение к промпту в зависимости от режима.
 */
function getModeInstructions(mode: ConsultMode): string {
  switch (mode) {
    case 'navigation':
      return '\n\n**Режим: навигация по коду.** Точно указывай файлы и строки где находится нужный код.'
    case 'architecture':
      return '\n\n**Режим: архитектурные решения.** Обоснуй паттерн, приведи аналоги из репо, укажи трейд-оффы.'
    case 'convention':
      return '\n\n**Режим: конвенции.** Строго следуй конвенциям letar, объясни почему именно так, дай пример.'
    case 'auto':
    default:
      return ''
  }
}

/**
 * Строит финальные сообщения для Ollama chat API.
 */
export function buildMessages(
  question: string,
  chunks: CodeChunk[],
  mode: ConsultMode = 'auto'
): Array<{ role: 'system' | 'user'; content: string }> {
  const systemContent = LETAR_SYSTEM_PROMPT + getModeInstructions(mode)

  const contextSection = formatChunksForPrompt(chunks)

  const userContent = `## Контекст из кодовой базы letar\n\n${contextSection}\n\n---\n\n## Вопрос\n\n${question}`

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ]
}
