// globals: true — describe, expect, it доступны глобально
import {
  calculateSlotsPerDay,
  DEFAULT_SCHEDULE_SETTINGS,
  getWorkDaysCount,
  minutesToTime,
  ScheduleSettingsFormSchema,
  timeToMinutes,
} from '../schedule-settings.schema'

import { DEFAULT_WORKING_HOURS, type WorkingHoursSchedule } from '@/lib/working-hours/types'

// Хелпер для создания валидных данных формы с JSON-строкой workingHours
function createValidFormData(overrides: Partial<{ workingHours: WorkingHoursSchedule }> = {}) {
  const workingHours = overrides.workingHours ?? DEFAULT_WORKING_HOURS
  return {
    workingHours: JSON.stringify(workingHours),
    lessonDuration: 90,
    breakDuration: 15,
    planningHorizon: 7,
  }
}

describe('ScheduleSettingsFormSchema', () => {
  describe('валидные данные', () => {
    it('принимает корректные настройки по умолчанию', () => {
      const result = ScheduleSettingsFormSchema.safeParse(createValidFormData())
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lessonDuration).toBe(90)
        expect(result.data.breakDuration).toBe(15)
        expect(result.data.planningHorizon).toBe(7)
      }
    })

    it('принимает минимальные значения', () => {
      const data = {
        workingHours: JSON.stringify({ monday: { open: '09:00', close: '18:00' } }),
        lessonDuration: 30,
        breakDuration: 0,
        planningHorizon: 1,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('принимает максимальные значения', () => {
      const data = {
        workingHours: JSON.stringify(DEFAULT_WORKING_HOURS),
        lessonDuration: 180,
        breakDuration: 60,
        planningHorizon: 30,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('workingHours - рабочие часы', () => {
    it('требует хотя бы один рабочий день', () => {
      const data = {
        workingHours: JSON.stringify({}),
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 7,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('отклоняет невалидный JSON', () => {
      const data = {
        workingHours: 'not a json',
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 7,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('принимает расписание только на выходные', () => {
      const data = {
        workingHours: JSON.stringify({
          saturday: { open: '10:00', close: '16:00' },
          sunday: { open: '10:00', close: '16:00' },
        }),
        lessonDuration: 90,
        breakDuration: 15,
        planningHorizon: 7,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('lessonDuration - длительность занятия', () => {
    it('принимает значения от 30 до 180 минут', () => {
      const validDurations = [30, 45, 60, 90, 120, 150, 180]
      validDurations.forEach((duration) => {
        const data = { ...createValidFormData(), lessonDuration: duration }
        const result = ScheduleSettingsFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('отклоняет значение меньше 30 минут', () => {
      const data = { ...createValidFormData(), lessonDuration: 29 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('30')
      }
    })

    it('отклоняет значение больше 180 минут', () => {
      const data = { ...createValidFormData(), lessonDuration: 181 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('180')
      }
    })

    it('преобразует строку в число (coerce)', () => {
      const data = { ...createValidFormData(), lessonDuration: '90' }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.lessonDuration).toBe(90)
      }
    })

    it('отклоняет нецелые значения', () => {
      const data = { ...createValidFormData(), lessonDuration: 90.5 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('breakDuration - перерыв между занятиями', () => {
    it('принимает значения от 0 до 60 минут', () => {
      const validBreaks = [0, 5, 10, 15, 30, 45, 60]
      validBreaks.forEach((breakDuration) => {
        const data = { ...createValidFormData(), breakDuration }
        const result = ScheduleSettingsFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('отклоняет отрицательные значения', () => {
      const data = { ...createValidFormData(), breakDuration: -1 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('отклоняет значение больше 60 минут', () => {
      const data = { ...createValidFormData(), breakDuration: 61 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('60')
      }
    })

    it('преобразует строку в число (coerce)', () => {
      const data = { ...createValidFormData(), breakDuration: '15' }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.breakDuration).toBe(15)
      }
    })
  })

  describe('planningHorizon - горизонт планирования', () => {
    it('принимает значения от 1 до 30 дней', () => {
      const validHorizons = [1, 7, 14, 21, 30]
      validHorizons.forEach((horizon) => {
        const data = { ...createValidFormData(), planningHorizon: horizon }
        const result = ScheduleSettingsFormSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('отклоняет значение меньше 1 дня', () => {
      const data = { ...createValidFormData(), planningHorizon: 0 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1')
      }
    })

    it('отклоняет значение больше 30 дней', () => {
      const data = { ...createValidFormData(), planningHorizon: 31 }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('30')
      }
    })

    it('преобразует строку в число (coerce)', () => {
      const data = { ...createValidFormData(), planningHorizon: '14' }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.planningHorizon).toBe(14)
      }
    })
  })

  describe('strip() - удаление лишних полей', () => {
    it('удаляет неизвестные поля из данных', () => {
      const data = {
        ...createValidFormData(),
        unknownField: 'should be stripped',
        anotherField: 123,
      }
      const result = ScheduleSettingsFormSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField')
        expect(result.data).not.toHaveProperty('anotherField')
      }
    })
  })
})

describe('timeToMinutes - преобразование времени в минуты', () => {
  it('преобразует начало дня', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })

  it('преобразует полдень', () => {
    expect(timeToMinutes('12:00')).toBe(720)
  })

  it('преобразует конец дня', () => {
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('преобразует произвольное время', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('18:00')).toBe(1080)
  })
})

describe('minutesToTime - преобразование минут во время', () => {
  it('преобразует 0 минут', () => {
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('преобразует 720 минут (полдень)', () => {
    expect(minutesToTime(720)).toBe('12:00')
  })

  it('преобразует 1439 минут (23:59)', () => {
    expect(minutesToTime(1439)).toBe('23:59')
  })

  it('добавляет ведущий ноль', () => {
    expect(minutesToTime(65)).toBe('01:05')
    expect(minutesToTime(9)).toBe('00:09')
  })
})

describe('calculateSlotsPerDay - расчёт слотов', () => {
  it('рассчитывает количество слотов для стандартного дня', () => {
    // 09:00 - 18:00 = 9 часов = 540 минут
    // 90 мин занятие + 15 мин перерыв = 105 мин на слот
    // (540 + 15) / 105 = 5.28 -> 5 слотов
    const slots = calculateSlotsPerDay('09:00', '18:00', 90, 15)
    expect(slots).toBe(5)
  })

  it('возвращает 0 если время конца раньше начала', () => {
    const slots = calculateSlotsPerDay('18:00', '09:00', 90, 15)
    expect(slots).toBe(0)
  })

  it('возвращает 0 если время одинаковое', () => {
    const slots = calculateSlotsPerDay('12:00', '12:00', 90, 15)
    expect(slots).toBe(0)
  })

  it('рассчитывает слоты без перерыва', () => {
    // 09:00 - 12:00 = 180 минут
    // 60 мин занятие + 0 мин перерыв = 60 мин на слот
    // (180 + 0) / 60 = 3 слота
    const slots = calculateSlotsPerDay('09:00', '12:00', 60, 0)
    expect(slots).toBe(3)
  })
})

describe('getWorkDaysCount - подсчёт рабочих дней', () => {
  it('возвращает 5 для стандартной рабочей недели', () => {
    const count = getWorkDaysCount(DEFAULT_WORKING_HOURS)
    expect(count).toBe(5)
  })

  it('возвращает 0 для пустого расписания', () => {
    const count = getWorkDaysCount({} as WorkingHoursSchedule)
    expect(count).toBe(0)
  })

  it('возвращает 2 для выходных', () => {
    const weekendOnly: WorkingHoursSchedule = {
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '10:00', close: '16:00' },
    }
    const count = getWorkDaysCount(weekendOnly)
    expect(count).toBe(2)
  })

  it('возвращает 7 для полной недели', () => {
    const fullWeek: WorkingHoursSchedule = {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '10:00', close: '16:00' },
      sunday: { open: '10:00', close: '16:00' },
    }
    const count = getWorkDaysCount(fullWeek)
    expect(count).toBe(7)
  })
})

describe('DEFAULT_SCHEDULE_SETTINGS', () => {
  it('имеет корректные значения по умолчанию', () => {
    expect(DEFAULT_SCHEDULE_SETTINGS.lessonDuration).toBe(90)
    expect(DEFAULT_SCHEDULE_SETTINGS.breakDuration).toBe(15)
    expect(DEFAULT_SCHEDULE_SETTINGS.planningHorizon).toBe(7)
    expect(DEFAULT_SCHEDULE_SETTINGS.workingHours).toEqual(DEFAULT_WORKING_HOURS)
  })
})
