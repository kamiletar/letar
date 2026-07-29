import { PatchSchema } from '@/lib/patch/schema'
import { z } from 'zod/v4'

// Крупные визуальные зоны студии — вокабуляр для focus_section().
// Соответствуют реальным блокам разметки в studio-client.tsx, не отдельным ручкам —
// точечная подсветка каждого нобa потребовала бы рефакторинга всех панелей параметров.
export const FocusSectionSchema = z.enum(['engine', 'hardware', 'performance', 'midi'])
export type FocusSection = z.infer<typeof FocusSectionSchema>

export const MidiSequenceNoteSchema = z.object({
  note: z.number().int().min(0).max(127),
  velocity: z.number().int().min(1).max(127).default(100),
  startMs: z.number().min(0),
  durationMs: z.number().min(1),
})
export type MidiSequenceNote = z.infer<typeof MidiSequenceNoteSchema>

// Единый канал MCP → браузер (SSE). Инструменты ментора и DAW сериализуются в одно
// и то же событие — на стороне браузера один хук (use-mentor-events) их различает по kind.
export const MentorEventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('highlight_param'), name: z.string().min(1), message: z.string().min(1) }),
  z.object({ kind: z.literal('dim_all') }),
  z.object({ kind: z.literal('focus_section'), section: FocusSectionSchema }),
  z.object({ kind: z.literal('load_patch'), patch: PatchSchema }),
  z.object({ kind: z.literal('midi_sequence'), notes: z.array(MidiSequenceNoteSchema).min(1).max(256) }),
])
export type MentorEvent = z.infer<typeof MentorEventSchema>

// Браузер репортит своё состояние на сервер (heartbeat) — читает MCP-ресурс daw://current-state
export const MentorStateReportSchema = z.object({
  engineType: z.enum(['subtractive', 'fm', 'drumkit']),
  patchName: z.string(),
  started: z.boolean(),
})
export type MentorStateReport = z.infer<typeof MentorStateReportSchema>
