import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { LuUsers } from 'react-icons/lu'
import { describe, expect, it } from 'vitest'
import { RoleStat, StatCard } from './stat-card'

import type { ReactNode } from 'react'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

describe('StatCard', () => {
  it('рендерит label и отформатированное числовое значение', () => {
    renderWithProvider(<StatCard icon={LuUsers} label="Пользователей" value={1234} />)
    expect(screen.getByText('Пользователей')).toBeInTheDocument()
    expect(screen.getByText('1 234')).toBeInTheDocument()
  })

  it('рендерит строковое значение без изменений', () => {
    renderWithProvider(<StatCard icon={LuUsers} label="Статус" value="Активен" />)
    expect(screen.getByText('Активен')).toBeInTheDocument()
  })

  it('рендерит subtext, если он передан', () => {
    renderWithProvider(<StatCard icon={LuUsers} label="Пользователей" value={100} subtext="+12% за месяц" />)
    expect(screen.getByText('+12% за месяц')).toBeInTheDocument()
  })

  it('не рендерит subtext, если он не передан', () => {
    const { container } = renderWithProvider(<StatCard icon={LuUsers} label="Пользователей" value={100} />)
    expect(container.textContent).not.toContain('%')
  })

  it('использует кастомную formatValue', () => {
    renderWithProvider(
      <StatCard
        icon={LuUsers}
        label="Выручка"
        value={5000}
        formatValue={(v) => `${v} ₽`}
      />,
    )
    expect(screen.getByText('5000 ₽')).toBeInTheDocument()
  })
})

describe('RoleStat', () => {
  it('рендерит count и label', () => {
    renderWithProvider(<RoleStat label="Инструкторов" count={15} />)
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Инструкторов')).toBeInTheDocument()
  })

  it('рендерит count=0', () => {
    renderWithProvider(<RoleStat label="Учеников" count={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
