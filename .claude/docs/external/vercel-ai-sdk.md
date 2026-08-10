# Vercel AI SDK — Документация

> Пакеты: `ai`, `@ai-sdk/openai`, `@ai-sdk/react`
> Docs: https://sdk.vercel.ai/docs

## Установка

```bash
bun add ai @ai-sdk/openai
bun add @ai-sdk/react  # для React хуков
```

---

## Базовые функции — AI Core

### generateText — однократная генерация

```typescript
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Напиши краткое резюме о Москве',
  system: 'Ты помощник, который отвечает только по-русски.',
  maxTokens: 500,
})

console.log(text)
console.log(usage) // { promptTokens, completionTokens, totalTokens }
```

### streamText — потоковая генерация

```typescript
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'

// В Route Handler (Next.js)
export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    messages, // сообщения в формате OpenAI
    system: 'Ты полезный помощник.',
  })

  return result.toUIMessageStreamResponse() // для useChat
  // или: result.toTextStreamResponse() — plain text стрим
}
```

---

## Tools (инструменты / вызов функций)

```typescript
import { openai } from '@ai-sdk/openai'
import { generateText, isStepCount, streamText, tool } from 'ai'
import { z } from 'zod'

// Определение инструмента
const weatherTool = tool({
  description: 'Получить погоду в городе',
  inputSchema: z.object({
    city: z.string().describe('Название города'),
    unit: z.enum(['C', 'F']).default('C'),
  }),
  execute: async ({ city, unit }) => {
    // Реальный запрос к API
    return { city, temperature: 22, unit, condition: 'солнечно' }
  },
})

// Использование
const result = await generateText({
  model: openai('gpt-4o'),
  tools: { weather: weatherTool },
  prompt: 'Какая погода в Москве?',
  stopWhen: isStepCount(5), // макс. 5 шагов для multi-step
  onFinish({ text, usage, toolCalls, toolResults }) {
    console.log('Завершено:', text)
  },
})

// Параллельные вызовы инструментов
console.log(result.toolCalls) // все вызовы
console.log(result.toolResults) // все результаты
```

---

## useChat — хук для чат-интерфейса

```tsx
'use client'
import { useChat } from '@ai-sdk/react'
import { useState } from 'react'

export function ChatInterface() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, status, error } = useChat({
    api: '/api/chat', // POST endpoint
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            <strong>{message.role === 'user' ? 'Вы' : 'AI'}:</strong>
            {message.parts.map((part, i) => {
              switch (part.type) {
                case 'text':
                  return <span key={i}>{part.text}</span>
                default:
                  return null
              }
            })}
          </div>
        ))}
      </div>

      {status === 'streaming' && <p>Печатает...</p>}
      {error && <p>Ошибка: {error.message}</p>}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== 'ready'}
          placeholder="Введите сообщение..."
        />
        <button type="submit" disabled={status !== 'ready'}>
          Отправить
        </button>
      </form>
    </div>
  )
}
```

---

## Route Handler — сервер для useChat

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, isStepCount, streamText, type UIMessage } from 'ai'
import { z } from 'zod'

export const maxDuration = 30 // 30 сек таймаут

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'Ты помощник по монорепо letar. Отвечай по-русски.',
    messages: await convertToModelMessages(messages),
    tools: {
      getCodeInfo: {
        description: 'Получить информацию о коде',
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => ({ info: `Данные по: ${query}` }),
      },
    },
    stopWhen: isStepCount(5),
  })

  return result.toUIMessageStreamResponse()
}
```

---

## generateObject — структурированный вывод

```typescript
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod/v4'

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
        }),
      ),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Придумай рецепт борща',
})

console.log(object.recipe.name) // Борщ
```

---

## Providers

```typescript
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'

// OpenAI
const model1 = openai('gpt-4o')
const model2 = openai('gpt-4o-mini')
const model3 = openai('o3')

// Anthropic
const model4 = anthropic('claude-opus-4-5')
const model5 = anthropic('claude-sonnet-4-5')

// Google
const model6 = google('gemini-2.5-pro')

// OpenAI-compatible (Ollama, llama.cpp)
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: 'http://localhost:11434/v1',
})
const localModel = ollama('qwen2.5-coder:14b')

// llama.cpp server (локальный OpenAI-совместимый эндпоинт)
const llamaCpp = createOpenAICompatible({
  name: 'llama-cpp',
  baseURL: 'http://localhost:8080/v1',
})
```

---

## Callbacks и события

```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Привет!',

  // Callbacks
  onFinish({ text, usage, finishReason, steps }) {
    console.log('Готово:', text)
    console.log('Токены:', usage.totalTokens)
  },

  onStepFinish({ text, toolCalls, toolResults }) {
    console.log('Шаг завершён')
  },

  onToolExecutionStart({ toolCall }) {
    console.log('Запуск инструмента:', toolCall.toolName)
  },

  onToolExecutionEnd({ toolCall, output }) {
    console.log('Инструмент завершён:', toolCall.toolName)
  },
})
```

---

## Интеграция AI в приложения letar

```typescript
// Для интеграции AI в приложения letar:

// Server Action с AI
'use server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export async function generateDescription(productName: string) {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-5'),
    prompt: `Напиши краткое описание товара: ${productName}`,
    maxTokens: 200,
  })
  return text
}
```

---

## Ссылки

- Docs: https://sdk.vercel.ai/docs
- GitHub: https://github.com/vercel/ai
- Providers: https://sdk.vercel.ai/providers
