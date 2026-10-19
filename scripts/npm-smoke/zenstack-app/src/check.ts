// Типовой контроль сгенерированных схем форм (после `zenstack generate`).
import type { z } from 'zod/v4'
import { UserCreateFormSchema } from './generated/form-schemas'

type UserInput = z.infer<typeof UserCreateFormSchema>

export const ok: UserInput = { name: 'Анна', role: 'USER' }

// @ts-expect-error name — строка; если схема превратилась в any, директива останется неиспользованной
export const bad: UserInput = { name: 42, role: 'USER' }
