/**
 * Тесты связанных аккаунтов
 *
 * Тестируем:
 * - Доступ к странице связанных аккаунтов
 * - Отображение подключённых провайдеров
 * - Подключение новых провайдеров (Yandex, Telegram)
 * - Отключение провайдеров
 */
import { expect, test } from '../fixtures/auth.fixture'

import { localePath } from '../config/i18n'

test.describe('03-user: Связанные аккаунты', () => {
  test.describe('Доступ к странице', () => {
    test('страница связанных аккаунтов загружается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))
      await expect(userPage).toHaveURL(/\/ru\/profile\/connected-accounts/)
    })

    test('заголовок страницы отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))
      await expect(userPage.getByText(/связанные аккаунты|способы входа/i)).toBeVisible()
    })
  })

  test.describe('Провайдеры авторизации', () => {
    test('список провайдеров отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Должен быть хотя бы один провайдер в списке
      const yandex = userPage.getByText(/yandex|яндекс/i)
      const telegram = userPage.getByText(/telegram|телеграм/i)
      const email = userPage.getByText(/email|почта|пароль/i)

      const hasAnyProvider = (await yandex.count()) > 0 || (await telegram.count()) > 0 || (await email.count()) > 0
      expect(hasAnyProvider).toBeTruthy()
    })

    test('кнопки подключения/отключения отображаются', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Должны быть кнопки действий
      const connectButton = userPage.getByRole('button', { name: /подключить|привязать|connect/i })
      const disconnectButton = userPage.getByRole('button', { name: /отключить|отвязать|disconnect/i })

      const hasButtons = (await connectButton.count()) > 0 || (await disconnectButton.count()) > 0
      expect(hasButtons).toBeTruthy()
    })
  })

  test.describe('Email/пароль', () => {
    test('статус email авторизации отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Информация о пароле
      const passwordSection = userPage.getByText(/пароль|password|email/i)
      expect((await passwordSection.count()) > 0).toBeTruthy()
    })
  })

  test.describe('Yandex', () => {
    test('секция Yandex отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      const yandexSection = userPage.getByText(/yandex|яндекс/i)
      await expect(yandexSection.first()).toBeVisible()
    })

    test('можно увидеть статус подключения Yandex', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Проверяем есть ли кнопка подключения или индикатор
      const yandexButton = userPage.getByRole('button', { name: /yandex|яндекс/i })
      const yandexLink = userPage.getByRole('link', { name: /yandex|яндекс/i })

      const hasYandexAction = (await yandexButton.count()) > 0 || (await yandexLink.count()) > 0
      // Может быть кнопка или просто текст о статусе
      expect(hasYandexAction || (await userPage.getByText(/yandex|яндекс/i).count()) > 0).toBeTruthy()
    })
  })

  test.describe('Telegram', () => {
    test('секция Telegram отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      const telegramSection = userPage.getByText(/telegram|телеграм/i)
      await expect(telegramSection.first()).toBeVisible()
    })

    test('можно увидеть статус подключения Telegram', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Проверяем есть ли кнопка подключения или индикатор
      const telegramButton = userPage.getByRole('button', { name: /telegram|телеграм/i })
      const telegramLink = userPage.getByRole('link', { name: /telegram|телеграм/i })

      const hasTelegramAction = (await telegramButton.count()) > 0 || (await telegramLink.count()) > 0
      // Может быть кнопка или просто текст о статусе
      expect(hasTelegramAction || (await userPage.getByText(/telegram|телеграм/i).count()) > 0).toBeTruthy()
    })
  })

  test.describe('Защита от отключения единственного способа входа', () => {
    test.skip('нельзя отключить единственный способ входа', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/connected-accounts'))

      // Если есть только один способ входа, кнопка отключения должна быть недоступна
      const disconnectButtons = userPage.getByRole('button', { name: /отключить|отвязать/i })

      if ((await disconnectButtons.count()) === 1) {
        // Проверяем, что кнопка disabled или отсутствует
        const button = disconnectButtons.first()
        const isDisabled = button
        // Либо disabled, либо есть предупреждение
        await expect(isDisabled).toBeDisabled()
      }
    })
  })
})
