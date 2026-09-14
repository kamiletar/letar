import { describe, expect, it } from 'vitest'
import type { BrandingConfig } from '../types'
import { createPasswordResetEmailHtml, createPasswordResetEmailText } from './password-reset'
import { createVerificationEmailHtml, createVerificationEmailText } from './verification'

const branding: BrandingConfig = { appName: 'TestApp', appUrl: 'https://example.com' }

describe('createVerificationEmailHtml/Text — срок действия PIN-кода', () => {
  it('дефолт 10 минут, если pinExpiresInMinutes не передан', () => {
    const html = createVerificationEmailHtml({ pin: '123456', branding })
    const text = createVerificationEmailText({ pin: '123456', branding })

    expect(html).toContain('действителен <strong>10 минут</strong>')
    expect(text).toContain('Код действителен 10 минут.')
  })

  it('передаёт кастомный pinExpiresInMinutes и в HTML, и в text', () => {
    const html = createVerificationEmailHtml({ pin: '123456', pinExpiresInMinutes: 15, branding })
    const text = createVerificationEmailText({ pin: '123456', pinExpiresInMinutes: 15, branding })

    expect(html).toContain('действителен <strong>15 минут</strong>')
    expect(html).not.toContain('10 минут')
    expect(text).toContain('Код действителен 15 минут.')
    expect(text).not.toContain('10 минут')
  })

  it('не рендерит блок PIN, если pin не передан', () => {
    const html = createVerificationEmailHtml({ verificationUrl: 'https://example.com/v/1', branding })

    expect(html).not.toContain('код подтверждения на сайте')
  })

  it('не рендерит кнопку/ссылку, если verificationUrl не передан', () => {
    const html = createVerificationEmailHtml({ pin: '123456', branding })
    const text = createVerificationEmailText({ pin: '123456', branding })

    expect(html).not.toContain('Подтвердить email')
    expect(html).not.toContain('Или скопируйте ссылку')
    expect(html).toContain('123456')
    expect(text).not.toContain('Подтвердить email:')
  })
})

describe('createPasswordResetEmailHtml/Text — срок действия PIN-кода', () => {
  it('дефолт 60 минут, если expiresInMinutes не передан', () => {
    const html = createPasswordResetEmailHtml({ resetUrl: 'https://example.com/r/1', pin: '654321', branding })
    const text = createPasswordResetEmailText({ resetUrl: 'https://example.com/r/1', pin: '654321', branding })

    expect(html).toContain('действителен <strong>60 минут</strong>')
    expect(text).toContain('Код действителен 60 минут.')
  })

  it('передаёт кастомный expiresInMinutes и в HTML, и в text (одновременно для ссылки и PIN)', () => {
    const html = createPasswordResetEmailHtml({
      resetUrl: 'https://example.com/r/1',
      pin: '654321',
      expiresInMinutes: 20,
      branding,
    })
    const text = createPasswordResetEmailText({
      resetUrl: 'https://example.com/r/1',
      pin: '654321',
      expiresInMinutes: 20,
      branding,
    })

    expect(html).toContain('действителен <strong>20 минут</strong>')
    expect(html).not.toContain('60 минут')
    expect(text).toContain('Код действителен 20 минут.')
    expect(text).not.toContain('60 минут')
  })

  it('pinExpiresInMinutes переопределяет срок PIN независимо от expiresInMinutes ссылки', () => {
    const html = createPasswordResetEmailHtml({
      resetUrl: 'https://example.com/r/1',
      pin: '654321',
      expiresInMinutes: 60,
      pinExpiresInMinutes: 10,
      branding,
    })

    expect(html).toContain('Код действителен <strong>10 минут</strong>')
    expect(html).toContain('Ссылка действительна <strong>60 минут</strong>')
  })
})

describe('createPasswordResetEmailHtml/Text — resetUrl опционален', () => {
  it('без resetUrl рендерит код, но не кнопку/ссылку', () => {
    const html = createPasswordResetEmailHtml({ pin: '654321', branding })
    const text = createPasswordResetEmailText({ pin: '654321', branding })

    expect(html).not.toContain('Сбросить пароль')
    expect(html).not.toContain('Или скопируйте ссылку')
    expect(html).toContain('Никому не передавайте этот код')
    expect(html).toContain('654321')
    expect(text).not.toContain('Сбросить пароль:')
    expect(text).toContain('654321')
  })

  it('без pin рендерит кнопку/ссылку, как раньше', () => {
    const html = createPasswordResetEmailHtml({ resetUrl: 'https://example.com/r/1', branding })

    expect(html).toContain('href="https://example.com/r/1"')
    expect(html).not.toContain('код подтверждения на сайте')
  })
})
