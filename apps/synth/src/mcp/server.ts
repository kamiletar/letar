import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod/v4'
import { PatchSchema } from '../lib/patch/schema.js'
import { CHORD_STYLES, CHORD_TYPES, generateChordPattern } from './chord-pattern.js'
import { DEMO_PATCHES, listDemoPatchIds } from './demo-patches.js'
import { createMentorClient, type MentorClient } from './mentor-client.js'

export interface SynthMcpServerOptions {
  baseUrl: string
  token?: string
  patchesDir: string
  name?: string
  version?: string
}

const MidiNoteInputSchema = z.object({
  note: z.number().int().min(0).max(127).describe('MIDI-нота 0-127 (60 = C4)'),
  velocity: z.number().int().min(1).max(127).default(100).describe('Сила удара 1-127'),
  startMs: z.number().min(0).describe('Смещение старта от начала последовательности, мс'),
  durationMs: z.number().min(1).describe('Длительность звучания ноты, мс'),
})

function readPublishedPatches(patchesDir: string): { id: string; name: string; type: string; tags: string[] }[] {
  let files: string[]
  try {
    files = readdirSync(patchesDir).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const summaries: { id: string; name: string; type: string; tags: string[] }[] = []
  for (const file of files) {
    try {
      const raw = readFileSync(join(patchesDir, file), 'utf-8')
      const patch = PatchSchema.parse(JSON.parse(raw))
      summaries.push({ id: patch.id, name: patch.name, type: patch.type, tags: patch.tags ?? [] })
    } catch {
      // пропускаем файл, который не прошёл валидацию — не роняем весь список
    }
  }
  return summaries
}

async function playDemoSequence(mentor: MentorClient, patchId: string): Promise<void> {
  const entry = DEMO_PATCHES[patchId]
  if (!entry) {
    throw new Error(`Неизвестный демо-патч "${patchId}". Доступные: ${listDemoPatchIds().join(', ')}`)
  }
  await mentor.emit({ kind: 'load_patch', patch: entry.patch })
  // небольшая пауза, чтобы студия успела переключить движок/применить патч до первой ноты
  await new Promise((resolve) => setTimeout(resolve, 300))
  await mentor.emit({ kind: 'midi_sequence', notes: entry.notes })
}

/** Создаёт MCP-сервер synth: инструменты ментора (highlight/focus/demo) + DAW (MIDI/патчи) */
export function createSynthMcpServer(options: SynthMcpServerOptions): McpServer {
  const { baseUrl, token, patchesDir, name = '@letar/synth-mcp', version = '1.0.0' } = options
  const mentor = createMentorClient({ baseUrl, token })

  const server = new McpServer({ name, version }, { capabilities: { resources: {}, tools: {} } })

  // ─── ИНСТРУМЕНТЫ МЕНТОРА ────────────────────────────────

  server.registerTool(
    'highlight_param',
    {
      description:
        'Подсвечивает золотом ручку/параметр студии и показывает всплывающую подсказку с физической метафорой. Используй, когда объясняешь конкретный параметр в чате.',
      inputSchema: {
        name: z.string().min(1).describe('Название параметра, как его видит владелец, напр. "Cutoff"'),
        message: z.string().min(1).describe('Короткое объяснение метафорой — 1-2 фразы'),
      },
    },
    async ({ name: paramName, message }) => {
      await mentor.emit({ kind: 'highlight_param', name: paramName, message })
      return { content: [{ type: 'text', text: `Подсветил «${paramName}» в студии.` }] }
    }
  )

  server.registerTool(
    'dim_all',
    { description: 'Гасит все подсветки и фокусы ментора в студии — сброс в нейтральное состояние.', inputSchema: {} },
    async () => {
      await mentor.emit({ kind: 'dim_all' })
      return { content: [{ type: 'text', text: 'Подсветки погашены.' }] }
    }
  )

  server.registerTool(
    'focus_section',
    {
      description:
        'Выделяет золотой рамкой и скроллит к целому блоку студии: engine (панель параметров текущего движка), hardware (зеркало SMK-37), performance (клавиатура/пэды), midi (статус MIDI и монитор).',
      inputSchema: { section: z.enum(['engine', 'hardware', 'performance', 'midi']) },
    },
    async ({ section }) => {
      await mentor.emit({ kind: 'focus_section', section })
      return { content: [{ type: 'text', text: `Фокус на блоке «${section}».` }] }
    }
  )

  server.registerTool(
    'play_demo',
    {
      description: `Загружает куратoрский демо-патч в студию и сразу проигрывает короткую демо-фразу. Доступные id: ${listDemoPatchIds().join(
        ', '
      )}.`,
      inputSchema: { patchId: z.enum(listDemoPatchIds() as [string, ...string[]]) },
    },
    async ({ patchId }) => {
      await playDemoSequence(mentor, patchId)
      return { content: [{ type: 'text', text: `Играю демо «${patchId}» — звук пойдёт, если студия запущена (▶).` }] }
    }
  )

  // ─── ИНСТРУМЕНТЫ DAW ─────────────────────────────────────

  server.registerTool(
    'load_patch',
    {
      description:
        'Загружает произвольный патч (JSON модели патча synth — type: fm|subtractive|drumkit) в студию, переключая движок при необходимости.',
      inputSchema: { patch: PatchSchema },
    },
    async ({ patch }) => {
      await mentor.emit({ kind: 'load_patch', patch })
      return { content: [{ type: 'text', text: `Патч «${patch.name}» (${patch.type}) отправлен в студию.` }] }
    }
  )

  server.registerTool(
    'send_midi_sequence',
    {
      description:
        'Проигрывает произвольную MIDI-последовательность нот прямо в студии (нужен запущенный звук — кнопка ▶ в браузере).',
      inputSchema: { notes: z.array(MidiNoteInputSchema).min(1).max(256) },
    },
    async ({ notes }) => {
      await mentor.emit({ kind: 'midi_sequence', notes })
      return { content: [{ type: 'text', text: `Отправлено ${notes.length} нот в студию.` }] }
    }
  )

  server.registerTool(
    'generate_chord_pattern',
    {
      description: `Генерирует и сразу проигрывает аккорд от заданной MIDI-ноты. Типы аккордов: ${CHORD_TYPES.join(
        ', '
      )}. Стили: ${CHORD_STYLES.join(', ')}.`,
      inputSchema: {
        root: z.number().int().min(0).max(127).describe('MIDI-нота корня, напр. 60 = C4'),
        chordType: z.enum(CHORD_TYPES),
        style: z.enum(CHORD_STYLES),
        arpeggioStepMs: z.number().min(20).max(2000).optional(),
        noteDurationMs: z.number().min(50).max(10000).optional(),
        velocity: z.number().int().min(1).max(127).optional(),
      },
    },
    async (params) => {
      const notes = generateChordPattern(params)
      await mentor.emit({ kind: 'midi_sequence', notes })
      return {
        content: [
          {
            type: 'text',
            text: `Аккорд ${params.chordType} (${params.style}) от ноты ${params.root} отправлен.`,
          },
        ],
      }
    }
  )

  // ─── РЕСУРСЫ ─────────────────────────────────────────────

  server.resource(
    'Текущий патч (сводка)',
    'synth://current-patch',
    {
      description:
        'Сводка о патче, загруженном в открытой вкладке студии сейчас (имя/тип движка/запущен ли звук). Не полный JSON патча — браузер репортит только сводку по heartbeat.',
      mimeType: 'application/json',
    },
    async () => {
      const state = await mentor.getState()
      return {
        contents: [
          {
            uri: 'synth://current-patch',
            mimeType: 'application/json',
            text: JSON.stringify(state, null, 2),
          },
        ],
      }
    }
  )

  server.resource(
    'Опубликованные патчи',
    'synth://patches',
    {
      description: 'Список патчей, опубликованных в витрину (apps/synth/patches/*.json).',
      mimeType: 'application/json',
    },
    async () => {
      const patches = readPublishedPatches(patchesDir)
      return {
        contents: [{ uri: 'synth://patches', mimeType: 'application/json', text: JSON.stringify(patches, null, 2) }],
      }
    }
  )

  server.resource(
    'Текущее состояние DAW',
    'daw://current-state',
    {
      description:
        'Состояние студии в открытой вкладке: запущен ли звук, сколько вкладок подключено к SSE-каналу ментора. Транспорт (play/stop позиция) появится в Фазе 3 (секвенсор).',
      mimeType: 'application/json',
    },
    async () => {
      const state = await mentor.getState()
      return {
        contents: [{ uri: 'daw://current-state', mimeType: 'application/json', text: JSON.stringify(state, null, 2) }],
      }
    }
  )

  return server
}
