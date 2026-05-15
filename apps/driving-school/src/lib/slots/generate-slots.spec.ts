import { generateSlotsForDay, generateSlotsForPeriod, type GenerateSlotsInput } from './generate-slots'

describe('generateSlotsForDay', () => {
  const defaultSettings: GenerateSlotsInput = {
    instructorId: 'instructor-1',
    workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    workStartTime: '09:00',
    workEndTime: '18:00',
    lessonDuration: 90,
    breakDuration: 15,
    customBreaks: [],
  }

  describe('генерация слотов на один день', () => {
    it('должен генерировать слоты на один рабочий день', () => {
      // Arrange - понедельник 2025-01-06
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert
      expect(slots.length).toBeGreaterThan(0)
      expect(slots[0].instructorId).toBe('instructor-1')
    })

    it('должен возвращать пустой массив для нерабочего дня', () => {
      // Arrange - воскресенье 2025-01-05
      const date = new Date('2025-01-05')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert
      expect(slots).toHaveLength(0)
    })

    it('должен генерировать 5 слотов для 9:00-18:00 с 90 мин занятиями и 15 мин перерывами', () => {
      // Arrange - понедельник 2025-01-06
      // 9:00-10:30 (слот 1)
      // 10:45-12:15 (слот 2)
      // 12:30-14:00 (слот 3)
      // 14:15-15:45 (слот 4)
      // 16:00-17:30 (слот 5)
      // Следующий слот начался бы в 17:45 и закончился в 19:15 - не помещается
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert
      expect(slots).toHaveLength(5)
    })

    it('должен создавать слоты с правильным временем начала и окончания', () => {
      // Arrange
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert - первый слот 9:00-10:30
      expect(slots[0].startTime.getHours()).toBe(9)
      expect(slots[0].startTime.getMinutes()).toBe(0)
      expect(slots[0].endTime.getHours()).toBe(10)
      expect(slots[0].endTime.getMinutes()).toBe(30)

      // Второй слот 10:45-12:15 (после 15 мин перерыва)
      expect(slots[1].startTime.getHours()).toBe(10)
      expect(slots[1].startTime.getMinutes()).toBe(45)
      expect(slots[1].endTime.getHours()).toBe(12)
      expect(slots[1].endTime.getMinutes()).toBe(15)
    })

    it('должен создавать слоты со статусом AVAILABLE', () => {
      // Arrange
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert
      slots.forEach((slot) => {
        expect(slot.status).toBe('AVAILABLE')
      })
    })
  })

  describe('учёт стандартных перерывов', () => {
    it('должен учитывать перерыв между занятиями', () => {
      // Arrange
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert - между концом первого слота и началом второго должно быть 15 минут
      const endFirst = slots[0].endTime.getTime()
      const startSecond = slots[1].startTime.getTime()
      const breakMinutes = (startSecond - endFirst) / (1000 * 60)

      expect(breakMinutes).toBe(15)
    })

    it('должен работать с нулевым перерывом', () => {
      // Arrange
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        breakDuration: 0,
      }
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert - слоты идут подряд без перерыва
      // 9:00-10:30, 10:30-12:00, 12:00-13:30, 13:30-15:00, 15:00-16:30, 16:30-18:00 = 6 слотов
      expect(slots).toHaveLength(6)
      expect(slots[0].endTime.getTime()).toBe(slots[1].startTime.getTime())
    })
  })

  describe('учёт кастомных перерывов', () => {
    it('должен пропускать слоты, пересекающиеся с обеденным перерывом', () => {
      // Arrange - обед с 12:00 до 13:00
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        customBreaks: [
          {
            isRecurring: true,
            dayOfWeek: 'MONDAY',
            startTime: '12:00',
            endTime: '13:00',
          },
        ],
      }
      const date = new Date('2025-01-06') // понедельник

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert - слот 10:45-12:15 пересекается с обедом 12:00-13:00, должен быть пропущен
      // Также слот 12:30-14:00 начинается в обед, тоже пропущен
      // Следующий слот после обеда начнётся в 13:00
      const slotsDuringLunch = slots.filter((slot) => {
        const startHour = slot.startTime.getHours()
        const startMin = slot.startTime.getMinutes()
        const endHour = slot.endTime.getHours()
        const endMin = slot.endTime.getMinutes()
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        // Перерыв 12:00-13:00 = 720-780 минут
        return startMinutes < 780 && endMinutes > 720
      })

      expect(slotsDuringLunch).toHaveLength(0)
    })

    it('должен учитывать разовый кастомный перерыв на конкретную дату', () => {
      // Arrange - разовый перерыв 6 января 15:00-16:00
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        customBreaks: [
          {
            isRecurring: false,
            specificDate: new Date('2025-01-06'),
            startTime: '15:00',
            endTime: '16:00',
          },
        ],
      }
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert - слот 14:15-15:45 пересекается с перерывом 15:00-16:00
      const slotsDuringBreak = slots.filter((slot) => {
        const startMinutes = slot.startTime.getHours() * 60 + slot.startTime.getMinutes()
        const endMinutes = slot.endTime.getHours() * 60 + slot.endTime.getMinutes()
        // Перерыв 15:00-16:00 = 900-960 минут
        return startMinutes < 960 && endMinutes > 900
      })

      expect(slotsDuringBreak).toHaveLength(0)
    })

    it('не должен применять регулярный перерыв к другому дню недели', () => {
      // Arrange - обед по понедельникам
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        workDays: ['MONDAY', 'TUESDAY'],
        customBreaks: [
          {
            isRecurring: true,
            dayOfWeek: 'MONDAY',
            startTime: '12:00',
            endTime: '13:00',
          },
        ],
      }
      const tuesday = new Date('2025-01-07') // вторник

      // Act
      const slots = generateSlotsForDay(tuesday, settings)

      // Assert - во вторник обеденный перерыв не применяется
      expect(slots).toHaveLength(5)
    })

    it('не должен применять разовый перерыв к другой дате', () => {
      // Arrange - перерыв только 6 января
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        customBreaks: [
          {
            isRecurring: false,
            specificDate: new Date('2025-01-06'),
            startTime: '12:00',
            endTime: '14:00',
          },
        ],
      }
      const anotherDay = new Date('2025-01-07') // вторник

      // Act
      const slots = generateSlotsForDay(anotherDay, settings)

      // Assert - в другой день перерыв не применяется
      expect(slots).toHaveLength(5)
    })
  })

  describe('различные настройки длительности', () => {
    it('должен работать с 60-минутными занятиями', () => {
      // Arrange
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        lessonDuration: 60,
        breakDuration: 15,
      }
      const date = new Date('2025-01-06')
      // 9:00-10:00, 10:15-11:15, 11:30-12:30, 12:45-13:45, 14:00-15:00, 15:15-16:15, 16:30-17:30
      // = 7 слотов

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert
      expect(slots).toHaveLength(7)
    })

    it('должен работать со 120-минутными занятиями', () => {
      // Arrange
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        lessonDuration: 120,
        breakDuration: 15,
      }
      const date = new Date('2025-01-06')
      // 9:00-11:00, 11:15-13:15, 13:30-15:30, 15:45-17:45
      // = 4 слота

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert
      expect(slots).toHaveLength(4)
    })

    it('должен работать с коротким рабочим днём', () => {
      // Arrange - только 3 часа
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        workStartTime: '10:00',
        workEndTime: '13:00',
        lessonDuration: 90,
        breakDuration: 15,
      }
      const date = new Date('2025-01-06')
      // 10:00-11:30 (слот 1)
      // 11:45-13:15 - не помещается (выходит за 13:00)
      // = 1 слот

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert
      expect(slots).toHaveLength(1)
    })
  })

  describe('граничные случаи рабочего времени', () => {
    it('не должен генерировать слоты за пределами рабочего времени', () => {
      // Arrange
      const date = new Date('2025-01-06')

      // Act
      const slots = generateSlotsForDay(date, defaultSettings)

      // Assert
      slots.forEach((slot) => {
        expect(slot.startTime.getHours()).toBeGreaterThanOrEqual(9)
        expect(slot.endTime.getHours() * 60 + slot.endTime.getMinutes()).toBeLessThanOrEqual(18 * 60)
      })
    })

    it('должен генерировать слот, если он точно заканчивается в конце рабочего дня', () => {
      // Arrange - настроим так, чтобы последний слот заканчивался ровно в 18:00
      const settings: GenerateSlotsInput = {
        ...defaultSettings,
        workStartTime: '09:00',
        workEndTime: '18:00',
        lessonDuration: 60,
        breakDuration: 0,
      }
      const date = new Date('2025-01-06')
      // 9 часов = 540 минут, 60 минут на занятие = 9 слотов
      // Последний слот 17:00-18:00

      // Act
      const slots = generateSlotsForDay(date, settings)

      // Assert
      expect(slots).toHaveLength(9)
      const lastSlot = slots[slots.length - 1]
      expect(lastSlot.endTime.getHours()).toBe(18)
      expect(lastSlot.endTime.getMinutes()).toBe(0)
    })
  })
})

describe('generateSlotsForPeriod', () => {
  const defaultSettings: GenerateSlotsInput = {
    instructorId: 'instructor-1',
    workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    workStartTime: '09:00',
    workEndTime: '18:00',
    lessonDuration: 90,
    breakDuration: 15,
    customBreaks: [],
  }

  it('должен генерировать слоты на неделю', () => {
    // Arrange - с понедельника 6 января 2025 на 7 дней
    const startDate = new Date('2025-01-06')
    const planningHorizon = 7

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, defaultSettings)

    // Assert - 5 рабочих дней * 5 слотов = 25 слотов
    expect(slots).toHaveLength(25)
  })

  it('должен генерировать слоты только для рабочих дней в периоде', () => {
    // Arrange - с воскресенья 5 января 2025 на 7 дней
    // Вс 5, Пн 6, Вт 7, Ср 8, Чт 9, Пт 10, Сб 11
    // Рабочие: Пн, Вт, Ср, Чт, Пт = 5 дней
    const startDate = new Date('2025-01-05')
    const planningHorizon = 7

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, defaultSettings)

    // Assert - 5 рабочих дней * 5 слотов = 25 слотов
    expect(slots).toHaveLength(25)
  })

  it('должен работать с настройками только на выходные', () => {
    // Arrange
    const settings: GenerateSlotsInput = {
      ...defaultSettings,
      workDays: ['SATURDAY', 'SUNDAY'],
    }
    const startDate = new Date('2025-01-06') // понедельник
    const planningHorizon = 7

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, settings)

    // Assert - только Сб 11 и Вс 12 = 2 дня * 5 слотов = 10 слотов
    expect(slots).toHaveLength(10)
  })

  it('должен возвращать слоты с правильными датами', () => {
    // Arrange
    const startDate = new Date('2025-01-06')
    const planningHorizon = 3

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, defaultSettings)

    // Assert - Пн 6, Вт 7, Ср 8 = 3 рабочих дня
    const uniqueDates = new Set(slots.map((s) => s.startTime.toDateString()))
    expect(uniqueDates.size).toBe(3)
  })

  it('должен применять кастомные перерывы к соответствующим дням', () => {
    // Arrange - обед по понедельникам и вторникам
    const settings: GenerateSlotsInput = {
      ...defaultSettings,
      workDays: ['MONDAY', 'TUESDAY'],
      customBreaks: [
        {
          isRecurring: true,
          dayOfWeek: 'MONDAY',
          startTime: '12:00',
          endTime: '13:00',
        },
      ],
    }
    const startDate = new Date('2025-01-06')
    const planningHorizon = 2 // Пн и Вт

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, settings)

    // Assert - в понедельник меньше слотов из-за обеда
    const mondaySlots = slots.filter((s) => s.startTime.getDay() === 1)
    const tuesdaySlots = slots.filter((s) => s.startTime.getDay() === 2)

    expect(mondaySlots.length).toBeLessThan(tuesdaySlots.length)
  })

  it('должен корректно обрабатывать горизонт планирования в 30 дней', () => {
    // Arrange
    const startDate = new Date('2025-01-06')
    const planningHorizon = 30

    // Act
    const slots = generateSlotsForPeriod(startDate, planningHorizon, defaultSettings)

    // Assert - примерно 22 рабочих дня в месяце (без учёта праздников)
    // 30 дней: примерно 4 недели + 2 дня = ~22 рабочих дня
    expect(slots.length).toBeGreaterThan(100)

    // Все слоты в пределах периода
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + planningHorizon)
    slots.forEach((slot) => {
      expect(slot.startTime.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      expect(slot.startTime.getTime()).toBeLessThan(endDate.getTime())
    })
  })
})

describe('вспомогательные функции', () => {
  // Тесты для getDayOfWeek
  describe('getDayOfWeek', () => {
    it('должен правильно определять день недели', () => {
      // Эти тесты будут добавлены при реализации
    })
  })

  // Тесты для проверки пересечения интервалов
  describe('intervalsOverlap', () => {
    it('должен определять пересечение интервалов', () => {
      // Эти тесты будут добавлены при реализации
    })
  })
})
