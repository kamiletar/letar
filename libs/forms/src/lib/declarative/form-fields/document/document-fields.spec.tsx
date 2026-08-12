import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import {
  validateBik,
  validateBirthCertificate,
  validateDepartmentCode,
  validateForeignPassport,
  validateInn10,
  validateInn12,
  validateKpp,
  validateOgrn,
  validateSnils,
} from '@letar/forms-core/validators/ru'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// --- ИНН ---
describe('FieldINN', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('ИНН')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('не показывает ошибку для пустого значения', () => {
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.queryByText(/ИНН должен содержать/)).not.toBeInTheDocument()
  })

  it('принимает валидный ИНН-10 (реальная контрольная сумма)', async () => {
    // Значение проверено validateInn10 напрямую — libs/forms-core/.../inn.spec.ts
    expect(validateInn10('7707083893')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '7707083893')

    expect(screen.queryByText('Неверная контрольная сумма ИНН')).not.toBeInTheDocument()
  })

  it('отклоняет ИНН-10 с неверной контрольной суммой', async () => {
    expect(validateInn10('7707083890')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '7707083890')

    expect(screen.getByText('Неверная контрольная сумма ИНН')).toBeInTheDocument()
  })

  it('принимает валидный ИНН-12 (реальная контрольная сумма)', async () => {
    expect(validateInn12('500100732259')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '500100732259')

    expect(screen.queryByText('Неверная контрольная сумма ИНН')).not.toBeInTheDocument()
  })

  it('отклоняет ИНН-12 с неверной контрольной суммой', async () => {
    expect(validateInn12('500100732250')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '500100732250')

    expect(screen.getByText('Неверная контрольная сумма ИНН')).toBeInTheDocument()
  })

  it('отклоняет ИНН неправильной длины', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" label="ИНН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '12345')

    expect(screen.getByText('ИНН должен содержать 10 или 12 цифр')).toBeInTheDocument()
  })

  it('устанавливает disabled', () => {
    render(
      <Form initialValue={{ inn: '' }} onSubmit={vi.fn()}>
        <Form.Document.INN name="inn" disabled />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

// --- БИК ---
describe('FieldBIK', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ bik: '' }} onSubmit={vi.fn()}>
        <Form.Document.BIK name="bik" label="БИК" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('БИК')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный БИК Сбербанка', async () => {
    expect(validateBik('044525225')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ bik: '' }} onSubmit={vi.fn()}>
        <Form.Document.BIK name="bik" label="БИК" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '044525225')

    expect(screen.queryByText('БИК должен начинаться с "04"')).not.toBeInTheDocument()
  })

  it('отклоняет БИК не начинающийся с "04"', async () => {
    expect(validateBik('124525225')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ bik: '' }} onSubmit={vi.fn()}>
        <Form.Document.BIK name="bik" label="БИК" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '124525225')

    expect(screen.getByText('БИК должен начинаться с "04"')).toBeInTheDocument()
  })

  it('отклоняет короткий БИК', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ bik: '' }} onSubmit={vi.fn()}>
        <Form.Document.BIK name="bik" label="БИК" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '04452')

    expect(screen.getByText('БИК должен содержать 9 цифр')).toBeInTheDocument()
  })
})

// --- ОГРН ---
describe('FieldOGRN', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ ogrn: '' }} onSubmit={vi.fn()}>
        <Form.Document.OGRN name="ogrn" label="ОГРН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('ОГРН')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный ОГРН Сбербанка (реальная контрольная сумма)', async () => {
    expect(validateOgrn('1027700132195')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ ogrn: '' }} onSubmit={vi.fn()}>
        <Form.Document.OGRN name="ogrn" label="ОГРН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '1027700132195')

    expect(screen.queryByText('Неверная контрольная сумма ОГРН')).not.toBeInTheDocument()
  })

  it('отклоняет ОГРН с неверной контрольной суммой', async () => {
    expect(validateOgrn('1027700132190')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ ogrn: '' }} onSubmit={vi.fn()}>
        <Form.Document.OGRN name="ogrn" label="ОГРН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '1027700132190')

    expect(screen.getByText('Неверная контрольная сумма ОГРН')).toBeInTheDocument()
  })

  it('отклоняет короткий ОГРН', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ ogrn: '' }} onSubmit={vi.fn()}>
        <Form.Document.OGRN name="ogrn" label="ОГРН" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '10277')

    expect(screen.getByText('ОГРН должен содержать 13 цифр')).toBeInTheDocument()
  })
})

// --- СНИЛС ---
describe('FieldSNILS', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ snils: '' }} onSubmit={vi.fn()}>
        <Form.Document.SNILS name="snils" label="СНИЛС" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('СНИЛС')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный СНИЛС (реальная контрольная сумма)', async () => {
    expect(validateSnils('11201745490')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ snils: '' }} onSubmit={vi.fn()}>
        <Form.Document.SNILS name="snils" label="СНИЛС" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '11201745490')

    expect(screen.queryByText('Неверная контрольная сумма СНИЛС')).not.toBeInTheDocument()
  })

  it('отклоняет СНИЛС с неверной контрольной суммой', async () => {
    expect(validateSnils('11201745491')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ snils: '' }} onSubmit={vi.fn()}>
        <Form.Document.SNILS name="snils" label="СНИЛС" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '11201745491')

    expect(screen.getByText('Неверная контрольная сумма СНИЛС')).toBeInTheDocument()
  })

  it('отклоняет короткий СНИЛС', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ snils: '' }} onSubmit={vi.fn()}>
        <Form.Document.SNILS name="snils" label="СНИЛС" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '123456')

    expect(screen.getByText('СНИЛС должен содержать 11 цифр')).toBeInTheDocument()
  })
})

// --- КПП ---
describe('FieldKPP', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ kpp: '' }} onSubmit={vi.fn()}>
        <Form.Document.KPP name="kpp" label="КПП" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('КПП')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный КПП', async () => {
    expect(validateKpp('770701001')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ kpp: '' }} onSubmit={vi.fn()}>
        <Form.Document.KPP name="kpp" label="КПП" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '770701001')

    expect(screen.queryByText('Неверный формат КПП')).not.toBeInTheDocument()
  })

  it('отклоняет КПП с буквами в первых 4 позициях (реальный validateKpp)', async () => {
    // Маска '*' (любой символ) заполняет незаполненные позиции placeholder'ом уже при
    // фокусе — значение всегда 9 символов, поэтому проверку длины через частичный ввод
    // не воспроизвести; проверяем формат на заведомо невалидном 9-символьном значении
    expect(validateKpp('ABCD01001')).toBe(false)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ kpp: '' }} onSubmit={vi.fn()}>
        <Form.Document.KPP name="kpp" label="КПП" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), 'ABCD01001')

    expect(screen.getByText('Неверный формат КПП')).toBeInTheDocument()
  })
})

// --- Паспорт ---
describe('FieldPassport', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ passport: '' }} onSubmit={vi.fn()}>
        <Form.Document.Passport name="passport" label="Паспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Паспорт')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает полный номер (серия + номер, 10 цифр)', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ passport: '' }} onSubmit={vi.fn()}>
        <Form.Document.Passport name="passport" label="Паспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '4506123456')

    expect(screen.queryByText('Паспорт: серия (4 цифры) + номер (6 цифр)')).not.toBeInTheDocument()
  })

  it('отклоняет короткий номер', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ passport: '' }} onSubmit={vi.fn()}>
        <Form.Document.Passport name="passport" label="Паспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '450612')

    expect(screen.getByText('Паспорт: серия (4 цифры) + номер (6 цифр)')).toBeInTheDocument()
  })
})

// --- Расчётный счёт ---
describe('FieldBankAccount', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ account: '' }} onSubmit={vi.fn()}>
        <Form.Document.BankAccount name="account" label="Расчётный счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Расчётный счёт')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает 20 цифр', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ account: '' }} onSubmit={vi.fn()}>
        <Form.Document.BankAccount name="account" label="Расчётный счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '40702810038000000001')

    expect(screen.queryByText('Расчётный счёт должен содержать 20 цифр')).not.toBeInTheDocument()
  })

  it('отклоняет короткий счёт', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ account: '' }} onSubmit={vi.fn()}>
        <Form.Document.BankAccount name="account" label="Расчётный счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '407028100')

    expect(screen.getByText('Расчётный счёт должен содержать 20 цифр')).toBeInTheDocument()
  })
})

// --- Корр. счёт ---
describe('FieldCorrAccount', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ corrAccount: '' }} onSubmit={vi.fn()}>
        <Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Корр. счёт')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный корр. счёт (20 цифр, начинается с "301")', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ corrAccount: '' }} onSubmit={vi.fn()}>
        <Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '30101810400000000225')

    expect(screen.queryByText('Корр. счёт должен начинаться с "301"')).not.toBeInTheDocument()
  })

  it('отклоняет счёт не начинающийся с "301"', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ corrAccount: '' }} onSubmit={vi.fn()}>
        <Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '40702810400000000225')

    expect(screen.getByText('Корр. счёт должен начинаться с "301"')).toBeInTheDocument()
  })

  it('отклоняет неправильную длину', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ corrAccount: '' }} onSubmit={vi.fn()}>
        <Form.Document.CorrAccount name="corrAccount" label="Корр. счёт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '30101810')

    expect(screen.getByText('Корр. счёт должен содержать 20 цифр')).toBeInTheDocument()
  })
})

// --- Загранпаспорт (Фаза 8, Этап 5) ---
describe('FieldForeignPassport', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ foreignPassport: '' }} onSubmit={vi.fn()}>
        <Form.Document.ForeignPassport name="foreignPassport" label="Загранпаспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Загранпаспорт')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает валидный номер (серия 2 + номер 7, 9 цифр)', async () => {
    expect(validateForeignPassport('750123456')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ foreignPassport: '' }} onSubmit={vi.fn()}>
        <Form.Document.ForeignPassport name="foreignPassport" label="Загранпаспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '750123456')

    expect(screen.queryByText('Загранпаспорт должен содержать 9 цифр (серия + номер)')).not.toBeInTheDocument()
  })

  it('отклоняет короткий номер', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ foreignPassport: '' }} onSubmit={vi.fn()}>
        <Form.Document.ForeignPassport name="foreignPassport" label="Загранпаспорт" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '7501234')

    expect(screen.getByText('Загранпаспорт должен содержать 9 цифр (серия + номер)')).toBeInTheDocument()
  })
})

// --- Код подразделения (Фаза 8, Этап 5) ---
describe('FieldDepartmentCode', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ departmentCode: '' }} onSubmit={vi.fn()}>
        <Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Код подразделения')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('принимает эталонный код (770-001)', async () => {
    expect(validateDepartmentCode('770001')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ departmentCode: '' }} onSubmit={vi.fn()}>
        <Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '770001')

    expect(screen.queryByText('Код подразделения должен содержать 6 цифр')).not.toBeInTheDocument()
  })

  it('НЕ отклоняет третью цифру вне списка 0-3 (реальные данные содержат 4, 5, 9)', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ departmentCode: '' }} onSubmit={vi.fn()}>
        <Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '774001')

    expect(screen.queryByText('Код подразделения должен содержать 6 цифр')).not.toBeInTheDocument()
  })

  it('отклоняет короткий код', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ departmentCode: '' }} onSubmit={vi.fn()}>
        <Form.Document.DepartmentCode name="departmentCode" label="Код подразделения" />
      </Form>,
      { wrapper: TestWrapper },
    )

    await user.type(screen.getByRole('textbox'), '7700')

    expect(screen.getByText('Код подразделения должен содержать 6 цифр')).toBeInTheDocument()
  })
})

// --- Свидетельство о рождении (Фаза 8, Этап 5) — без маски, нормализация на blur ---
describe('FieldBirthCertificate', () => {
  it('рендерит label и input', () => {
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Свидетельство о рождении')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('не показывает ошибку для пустого значения', () => {
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.queryByText(/Формат:/)).not.toBeInTheDocument()
  })

  it('не форматирует ввод сразу — только по потере фокуса (blur)', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
      </Form>,
      { wrapper: TestWrapper },
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '|||МЮ123456')

    expect(input).toHaveValue('|||МЮ123456')
  })

  it('нормализует гомоглифы на blur (|||→III) и принимает результат', async () => {
    expect(validateBirthCertificate('|||МЮ123456')).toBe(true)

    const user = userEvent.setup()
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
      </Form>,
      { wrapper: TestWrapper },
    )

    const input = screen.getByRole('textbox')
    await user.type(input, '|||МЮ123456')
    await user.tab()

    expect(input).toHaveValue('III-МЮ № 123456')
    expect(screen.queryByText(/Формат:/)).not.toBeInTheDocument()
  })

  it('отклоняет неполный ввод после нормализации на blur', async () => {
    const user = userEvent.setup()
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" label="Свидетельство о рождении" />
      </Form>,
      { wrapper: TestWrapper },
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'II-МЮ')
    await user.tab()

    expect(screen.getByText(/Формат:/)).toBeInTheDocument()
  })

  it('устанавливает disabled', () => {
    render(
      <Form initialValue={{ birthCertificate: '' }} onSubmit={vi.fn()}>
        <Form.Document.BirthCertificate name="birthCertificate" disabled />
      </Form>,
      { wrapper: TestWrapper },
    )

    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
