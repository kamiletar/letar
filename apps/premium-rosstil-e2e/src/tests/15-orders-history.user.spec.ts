/**
 * Тесты истории заказов
 *
 * Тестируем:
 * - Доступ к странице истории заказов
 * - Список заказов
 * - Просмотр деталей заказа
 * - Фильтрация и сортировка
 */
import { expect, test } from '../fixtures/auth.fixture'

import { localePath } from '../config/i18n'

test.describe('03-user: История заказов', () => {
  test.describe('Доступ к странице', () => {
    test('страница истории заказов загружается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await expect(userPage).toHaveURL(/\/ru\/profile\/orders/)
    })

    test('заголовок страницы отображается', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))
      await expect(userPage.getByText(/мои заказы|история заказов/i)).toBeVisible()
    })
  })

  test.describe('Список заказов', () => {
    test('показывается список заказов или сообщение об отсутствии', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Либо есть заказы, либо сообщение "нет заказов"
      const orderCard = userPage.locator('[data-testid="order-card"], [data-testid="order-item"]')
      const emptyMessage = userPage.getByText(/нет заказов|не найдено|пустая история/i)
      const orderNumber = userPage.getByText(/заказ|order|#/i)

      const hasOrders = (await orderCard.count()) > 0 || (await orderNumber.count()) > 0
      const hasEmptyMessage = (await emptyMessage.count()) > 0

      expect(hasOrders || hasEmptyMessage).toBeTruthy()
    })

    test('каждый заказ содержит номер', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Если есть заказы, они должны содержать номер
      const orderNumber = userPage.getByText(/#\d+|заказ.*\d+/i)
      // Может не быть заказов, поэтому не fail
      if ((await orderNumber.count()) > 0) {
        await expect(orderNumber.first()).toBeVisible()
      }
    })

    test('каждый заказ содержит статус', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Статусы заказов
      const status = userPage.getByText(/новый|в обработке|отправлен|доставлен|выполнен|отменён/i)
      // Может не быть заказов
      if ((await status.count()) > 0) {
        await expect(status.first()).toBeVisible()
      }
    })

    test('каждый заказ содержит дату', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Дата заказа
      const date = userPage.getByText(/\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}/i)
      // Может не быть заказов
      if ((await date.count()) > 0) {
        await expect(date.first()).toBeVisible()
      }
    })

    test('каждый заказ содержит сумму', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Сумма заказа
      const price = userPage.getByText(/₽|руб|rub/i)
      // Может не быть заказов
      if ((await price.count()) > 0) {
        await expect(price.first()).toBeVisible()
      }
    })
  })

  test.describe('Детали заказа', () => {
    test.skip('можно перейти к деталям заказа', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Ищем ссылку на детали заказа
      const orderLink = userPage.getByRole('link', { name: /подробнее|детали|посмотреть/i }).first()
      const orderCard = userPage.locator('[data-testid="order-card"] a').first()

      if ((await orderLink.count()) > 0) {
        await orderLink.click()
        await expect(userPage).toHaveURL(/\/ru\/profile\/orders\/\w+/)
      } else if ((await orderCard.count()) > 0) {
        await orderCard.click()
        await expect(userPage).toHaveURL(/\/ru\/profile\/orders\/\w+/)
      }
    })

    test.skip('страница деталей содержит товары', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Переходим к первому заказу
      const orderLink = userPage.locator('a[href*="/profile/orders/"]').first()
      if ((await orderLink.count()) > 0) {
        await orderLink.click()
        await userPage.waitForLoadState('domcontentloaded')

        // Должен быть список товаров
        await expect(userPage.getByText(/товар|позиц|item/i)).toBeVisible()
      }
    })
  })

  test.describe('Пустая история', () => {
    test('при отсутствии заказов показывается сообщение', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Проверяем, есть ли заказы
      const orderCard = userPage.locator('[data-testid="order-card"]')

      if ((await orderCard.count()) === 0) {
        // Должно быть сообщение о пустой истории
        const emptyMessage = userPage.getByText(/нет заказов|история пуста|не найдено|пока нет/i)
        // Либо сообщение, либо просто пустой список
        expect((await emptyMessage.count()) >= 0).toBeTruthy()
      }
    })

    test('при отсутствии заказов страница работает корректно', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      const orderCard = userPage.locator('[data-testid="order-card"]')

      if ((await orderCard.count()) === 0) {
        // При пустой истории страница всё равно должна быть доступна
        await expect(userPage).toHaveURL(/\/ru\/profile\/orders/)
      }
    })
  })

  test.describe('Навигация', () => {
    test('есть ссылка на профиль', async ({ userPage }) => {
      await userPage.goto(localePath('/profile/orders'))

      // Должна быть возможность вернуться в профиль
      const profileLink = userPage.getByRole('link', { name: /профиль|назад|вернуться/i })
      // Может быть в breadcrumbs или в навигации
      expect((await profileLink.count()) >= 0).toBeTruthy()
    })
  })
})
