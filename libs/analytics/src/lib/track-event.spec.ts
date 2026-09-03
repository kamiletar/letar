import { describe, expect, it, vi } from 'vitest'
import { sanitizeEventData } from './track-event'

// Требование 152-ФЗ (§11.15 PLAN.md aboi): «У событий нет текста слов, email, телефона, адреса,
// order token и другой ПДн». Дисциплина «не передавай ПДн в trackEvent» этого не гарантирует —
// гарантирует фильтр, поэтому он и покрыт тестами.
describe('sanitizeEventData', () => {
  it('пропускает безопасные поля без изменений', () => {
    const data = { productSlug: 'lesnaya-mantra', variantName: 'Квадрат 91×91', quantity: 2 }
    expect(sanitizeEventData(data)).toEqual(data)
  })

  it('вырезает email по имени поля', () => {
    expect(sanitizeEventData({ customerEmail: 'a@b.ru', quantity: 1 })).toEqual({ quantity: 1 })
  })

  it('вырезает телефон и адрес по имени поля', () => {
    expect(sanitizeEventData({ phone: '+79001234567', address: 'Красноярск, Ленина 1', step: 2 })).toEqual({ step: 2 })
  })

  it('вырезает accessToken заказа — прямой запрет', () => {
    expect(sanitizeEventData({ accessToken: 'abc', paid: true })).toEqual({ paid: true })
  })

  it('вырезает email, приехавший под безобидным именем поля', () => {
    // Страховка на случай, если ПДн передадут как `value`/`id` — имя поля запрет не поймает.
    expect(sanitizeEventData({ value: 'kami@example.com', step: 1 })).toEqual({ step: 1 })
  })

  it('вырезает телефон, приехавший под безобидным именем поля', () => {
    expect(sanitizeEventData({ contact: '+7 (900) 123-45-67' })).toBeUndefined()
  })

  it('вырезает длинную бесшовную строку — форма токена доступа', () => {
    expect(sanitizeEventData({ ref: 'a'.repeat(40), step: 3 })).toEqual({ step: 3 })
  })

  it('не принимает короткий числовой идентификатор за телефон', () => {
    // Порог — 10 цифр: количество, сумма и номер шага не должны вырезаться.
    expect(sanitizeEventData({ totalKopecks: '250600', quantity: 3 })).toEqual({
      totalKopecks: '250600',
      quantity: 3,
    })
  })

  it('undefined на входе — undefined на выходе, без падения', () => {
    expect(sanitizeEventData(undefined)).toBeUndefined()
  })

  it('всё вырезано — undefined, а не пустой объект', () => {
    // Umami не должен получать `{}`: пустая нагрузка и отсутствие нагрузки — одно и то же.
    expect(sanitizeEventData({ email: 'a@b.ru' })).toBeUndefined()
  })

  it('предупреждает в dev о вырезанном поле', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sanitizeEventData({ customerPhone: '+79001234567' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('customerPhone'))
    warn.mockRestore()
  })

  it('без extraForbiddenKeyFragments доменные поля приложения не режутся', () => {
    // `words` — не в дефолтном списке: он доменный (вплетённые слова товара у aboi), тащить
    // его в общий дефолт незачем — см. extraForbiddenKeyFragments ниже.
    expect(sanitizeEventData({ words: ['покой', 'ясность'] })).toEqual({ words: ['покой', 'ясность'] })
  })

  it('extraForbiddenKeyFragments расширяет дефолтный список, не заменяет его', () => {
    const extra = ['words?']
    expect(sanitizeEventData({ words: ['покой'], email: 'a@b.ru', step: 1 }, extra)).toEqual({ step: 1 })
  })
})
