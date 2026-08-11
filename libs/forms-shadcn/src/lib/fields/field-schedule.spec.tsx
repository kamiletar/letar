import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSchedule } from './field-schedule'
import type { WeeklySchedule } from './types'

const schedule: WeeklySchedule = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

describe('FieldSchedule (shadcn)', () => {
  it('рендерит все дни недели с меткой', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    expect(screen.getByText('Часы работы')).toBeInTheDocument()
    expect(screen.getByText('Понедельник')).toBeInTheDocument()
    expect(screen.getByText('Воскресенье')).toBeInTheDocument()
  })

  it('показывает время для включённого дня и "Выходной" для выключенного', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    expect(screen.getAllByText('Выходной')).toHaveLength(5)
    const timeInputs = document.querySelectorAll('input[type="time"]')
    expect(timeInputs).toHaveLength(4)
  })

  it('включает день по клику на переключатель', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    const wednesdaySwitch = document.querySelector('[data-day-switch="wednesday"]') as HTMLElement
    fireEvent.click(wednesdaySwitch)

    const wednesdayRow = document.querySelector('[data-day="wednesday"]') as HTMLElement
    expect(wednesdayRow.querySelectorAll('input[type="time"]')).toHaveLength(2)
  })

  it('выключает день по повторному клику', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    const mondaySwitch = document.querySelector('[data-day-switch="monday"]') as HTMLElement
    fireEvent.click(mondaySwitch)

    const mondayRow = document.querySelector('[data-day="monday"]') as HTMLElement
    expect(mondayRow.querySelectorAll('input[type="time"]')).toHaveLength(0)
  })

  it('копирует понедельник на будни', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    fireEvent.click(screen.getByText('Скопировать Пн на будни'))
    const fridayRow = document.querySelector('[data-day="friday"]') as HTMLElement
    expect(fridayRow.querySelectorAll('input[type="time"]')).toHaveLength(2)
  })

  it('показывает предупреждение при close <= open', () => {
    const invalidSchedule: WeeklySchedule = {
      ...schedule,
      monday: { open: '18:00', close: '09:00' },
    }
    render(
      <TestForm defaultValues={{ hours: invalidSchedule }}>
        <FieldSchedule name="hours" label="Часы работы" />
      </TestForm>,
    )

    expect(screen.getByText(/Время закрытия должно быть позже открытия/)).toBeInTheDocument()
  })

  it('days сужает список дней', () => {
    render(
      <TestForm defaultValues={{ hours: schedule }}>
        <FieldSchedule name="hours" label="Часы работы" days={['monday', 'tuesday']} />
      </TestForm>,
    )

    expect(screen.getByText('Понедельник')).toBeInTheDocument()
    expect(screen.queryByText('Воскресенье')).not.toBeInTheDocument()
  })
})
