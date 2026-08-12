import {
  validateBik,
  validateInn10,
  validateInn12,
  validateKpp,
  validateOgrn,
  validateSnils,
} from '@letar/forms-core/validators/ru'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FieldBankAccount, FieldCorrAccount } from './field-bank-account'
import { FieldBIK } from './field-bik'
import { FieldINN } from './field-inn'
import { FieldKPP } from './field-kpp'
import { FieldOGRN } from './field-ogrn'
import { FieldPassport } from './field-passport'
import { FieldSNILS } from './field-snils'

// --- ИНН ---
describe('FieldINN (shadcn)', () => {
  it('рендерит label и input', () => {
    render(
      <TestForm defaultValues={{ inn: '' }}>
        <FieldINN name="inn" label="ИНН" />
      </TestForm>,
    )

    expect(screen.getByText('ИНН')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный ИНН-10 (реальная контрольная сумма)', async () => {
    expect(validateInn10('7707083893')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ inn: '' }}>
        <FieldINN name="inn" label="ИНН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '7707083893')

    expect(screen.queryByText('Неверная контрольная сумма ИНН')).not.toBeInTheDocument()
  })

  it('отклоняет ИНН-10 с неверной контрольной суммой', async () => {
    expect(validateInn10('7707083890')).toBe(false)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ inn: '' }}>
        <FieldINN name="inn" label="ИНН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '7707083890')

    expect(screen.getByText('Неверная контрольная сумма ИНН')).toBeInTheDocument()
  })

  it('принимает валидный ИНН-12 (реальная контрольная сумма)', async () => {
    expect(validateInn12('500100732259')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ inn: '' }}>
        <FieldINN name="inn" label="ИНН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '500100732259')

    expect(screen.queryByText('Неверная контрольная сумма ИНН')).not.toBeInTheDocument()
  })

  it('отклоняет ИНН неправильной длины', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ inn: '' }}>
        <FieldINN name="inn" label="ИНН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '12345')

    expect(screen.getByText('ИНН должен содержать 10 или 12 цифр')).toBeInTheDocument()
  })
})

// --- КПП ---
describe('FieldKPP (shadcn)', () => {
  it('принимает валидный КПП', async () => {
    expect(validateKpp('770701001')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ kpp: '' }}>
        <FieldKPP name="kpp" label="КПП" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '770701001')

    expect(screen.queryByText('Неверный формат КПП')).not.toBeInTheDocument()
  })

  it('отклоняет КПП с буквами в первых 4 позициях (реальный validateKpp)', async () => {
    expect(validateKpp('ABCD01001')).toBe(false)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ kpp: '' }}>
        <FieldKPP name="kpp" label="КПП" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), 'ABCD01001')

    expect(screen.getByText('Неверный формат КПП')).toBeInTheDocument()
  })
})

// --- ОГРН ---
describe('FieldOGRN (shadcn)', () => {
  it('принимает валидный ОГРН (реальная контрольная сумма)', async () => {
    expect(validateOgrn('1027700132195')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ ogrn: '' }}>
        <FieldOGRN name="ogrn" label="ОГРН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '1027700132195')

    expect(screen.queryByText('Неверная контрольная сумма ОГРН')).not.toBeInTheDocument()
  })

  it('отклоняет короткий ОГРН', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ ogrn: '' }}>
        <FieldOGRN name="ogrn" label="ОГРН" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '10277')

    expect(screen.getByText('ОГРН должен содержать 13 цифр')).toBeInTheDocument()
  })
})

// --- СНИЛС ---
describe('FieldSNILS (shadcn)', () => {
  it('принимает валидный СНИЛС (реальная контрольная сумма)', async () => {
    expect(validateSnils('11201745490')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ snils: '' }}>
        <FieldSNILS name="snils" label="СНИЛС" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '11201745490')

    expect(screen.queryByText('Неверная контрольная сумма СНИЛС')).not.toBeInTheDocument()
  })

  it('отклоняет короткий СНИЛС', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ snils: '' }}>
        <FieldSNILS name="snils" label="СНИЛС" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '123456')

    expect(screen.getByText('СНИЛС должен содержать 11 цифр')).toBeInTheDocument()
  })
})

// --- Паспорт ---
describe('FieldPassport (shadcn)', () => {
  it('принимает полный номер (серия + номер, 10 цифр)', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ passport: '' }}>
        <FieldPassport name="passport" label="Паспорт" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '4506123456')

    expect(screen.queryByText('Паспорт: серия (4 цифры) + номер (6 цифр)')).not.toBeInTheDocument()
  })

  it('отклоняет короткий номер', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ passport: '' }}>
        <FieldPassport name="passport" label="Паспорт" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '450612')

    expect(screen.getByText('Паспорт: серия (4 цифры) + номер (6 цифр)')).toBeInTheDocument()
  })
})

// --- БИК ---
describe('FieldBIK (shadcn)', () => {
  it('принимает валидный БИК Сбербанка', async () => {
    expect(validateBik('044525225')).toBe(true)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ bik: '' }}>
        <FieldBIK name="bik" label="БИК" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '044525225')

    expect(screen.queryByText('БИК должен начинаться с "04"')).not.toBeInTheDocument()
  })

  it('отклоняет БИК не начинающийся с "04"', async () => {
    expect(validateBik('124525225')).toBe(false)

    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ bik: '' }}>
        <FieldBIK name="bik" label="БИК" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '124525225')

    expect(screen.getByText('БИК должен начинаться с "04"')).toBeInTheDocument()
  })
})

// --- Расчётный и корр. счёт ---
describe('FieldBankAccount / FieldCorrAccount (shadcn)', () => {
  it('FieldBankAccount принимает 20 цифр', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ account: '' }}>
        <FieldBankAccount name="account" label="Расчётный счёт" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '40702810038000000001')

    expect(screen.queryByText('Расчётный счёт должен содержать 20 цифр')).not.toBeInTheDocument()
  })

  it('FieldCorrAccount принимает счёт с "301"', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ corrAccount: '' }}>
        <FieldCorrAccount name="corrAccount" label="Корр. счёт" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '30101810400000000225')

    expect(screen.queryByText('Корр. счёт должен начинаться с "301"')).not.toBeInTheDocument()
  })

  it('FieldCorrAccount отклоняет счёт не начинающийся с "301"', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ corrAccount: '' }}>
        <FieldCorrAccount name="corrAccount" label="Корр. счёт" />
      </TestForm>,
    )

    await user.type(screen.getByRole('textbox'), '40702810400000000225')

    expect(screen.getByText('Корр. счёт должен начинаться с "301"')).toBeInTheDocument()
  })
})
