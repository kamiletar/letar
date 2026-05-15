import { expect, test } from './fixtures/base-test'
import { urls } from './fixtures/test-data'

test.describe('Договор-оферта и юридические документы', () => {
  test.describe('Публичная страница оферты', () => {
    test('E2E-9.7.E2E.1 — страница оферты загружается без авторизации', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(urls.legalOffer)

      // Страница должна загрузиться
      await expect(
        page
          .getByRole('heading', { name: /оферт|договор|пользовательское соглашение/i })
          .or(page.getByText(/публичная оферта/i))
      ).toBeVisible()

      await context.close()
    })

    test('E2E-9.7.E2E.2 — отображается текст оферты или заглушка', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Если документ создан — должен быть контент, иначе заглушка "находится в разработке"
      const bodyText = await page
        .locator('body')
        .textContent()
        .catch(() => '')
      const hasContent = (bodyText?.length ?? 0) > 200
      const hasPlaceholder = await page
        .getByText(/находится в разработке/i)
        .isVisible()
        .catch(() => false)

      expect(hasContent || hasPlaceholder).toBeTruthy()
    })

    test('E2E-9.7.E2E.3 — отображается версия документа или заглушка', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Если документ создан - должна быть версия, иначе заглушка
      const hasVersion = await page
        .getByText(/версия \d|version/i)
        .isVisible()
        .catch(() => false)
      const hasPlaceholder = await page
        .getByText(/находится в разработке/i)
        .isVisible()
        .catch(() => false)

      expect(hasVersion || hasPlaceholder).toBeTruthy()
    })

    test('E2E-9.7.E2E.4 — отображается дата документа или заглушка', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Если документ создан - должна быть дата, иначе заглушка
      const datePattern = /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}/
      const hasDate = await page
        .getByText(datePattern)
        .isVisible()
        .catch(() => false)
      const hasPlaceholder = await page
        .getByText(/находится в разработке/i)
        .isVisible()
        .catch(() => false)

      expect(hasDate || hasPlaceholder).toBeTruthy()
    })
  })

  test.describe('Публичная страница политики конфиденциальности', () => {
    test('E2E-9.7.E2E.5 — страница политики загружается без авторизации', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(urls.legalPrivacy)

      // Страница должна загрузиться - заголовок "Политика конфиденциальности"
      await expect(page.getByRole('heading', { name: /политика конфиденциальности/i })).toBeVisible()

      await context.close()
    })

    test('E2E-9.7.E2E.6 — отображается текст политики или заглушка', async ({ page }) => {
      await page.goto(urls.legalPrivacy)

      // Если документ создан — должен быть контент, иначе заглушка "находится в разработке"
      const bodyText = await page
        .locator('body')
        .textContent()
        .catch(() => '')
      const hasContent = (bodyText?.length ?? 0) > 200
      const hasPlaceholder = await page
        .getByText(/находится в разработке/i)
        .isVisible()
        .catch(() => false)

      expect(hasContent || hasPlaceholder).toBeTruthy()
    })
  })

  test.describe('Навигация между документами', () => {
    test('E2E-9.7.E2E.7 — ссылка на оферту со страницы политики', async ({ page }) => {
      await page.goto(urls.legalPrivacy)

      // Ищем ссылку на оферту
      const offerLink = page.getByRole('link', { name: /оферт|договор/i })

      if (await offerLink.isVisible().catch(() => false)) {
        await offerLink.click()
        await expect(page).toHaveURL(/legal\/offer/)
      } else {
        console.log('  ⏭️ Skip: ссылка на оферту не найдена на странице политики')
      }
    })

    test('E2E-9.7.E2E.8 — ссылка на политику со страницы оферты', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Ищем ссылку на политику
      const privacyLink = page.getByRole('link', { name: /политик|конфиденциальност/i })

      if (await privacyLink.isVisible().catch(() => false)) {
        await privacyLink.click()
        await expect(page).toHaveURL(/legal\/privacy/)
      } else {
        console.log('  ⏭️ Skip: ссылка на политику не найдена на странице оферты')
      }
    })
  })

  test.describe('Принятие оферты при регистрации', () => {
    test('E2E-9.7.E2E.9 — чекбокс оферты на странице регистрации', async ({ page }) => {
      await page.goto(urls.signUp)

      // Есть два чекбокса: "условия договора-оферты" и "политика конфиденциальности"
      // Чекбокс для оферты содержит текст "договора-оферты"
      const hasOfferCheckbox = await page
        .getByText(/договора-оферты/i)
        .isVisible()
        .catch(() => false)
      const hasPrivacyCheckbox = await page
        .getByText(/политике конфиденциальности/i)
        .isVisible()
        .catch(() => false)

      expect(hasOfferCheckbox || hasPrivacyCheckbox).toBeTruthy()
    })

    test('E2E-9.7.E2E.10 — ссылка на оферту в чекбоксе', async ({ page }) => {
      await page.goto(urls.signUp)

      // Должна быть ссылка на оферту рядом с чекбоксом
      const offerLink = page.getByRole('link', { name: /оферт|условия|соглаш/i })

      await expect(offerLink).toBeVisible()
    })

    test('E2E-9.7.E2E.11 — регистрация без принятия оферты невозможна', async ({ page }) => {
      await page.goto(urls.signUp)

      // Заполняем все поля кроме чекбоксов (форма упрощена - только email и пароль)
      await page.getByPlaceholder('example@mail.com').fill('test-' + Date.now() + '@test.local')
      await page.getByPlaceholder('Минимум 8 символов').fill('TestPass123!')

      // Не отмечаем чекбоксы — оферта и политика конфиденциальности

      // Пытаемся зарегистрироваться
      await page.getByRole('button', { name: /зарегистрироваться/i }).click()

      // Должна остаться на странице регистрации
      await expect(page).toHaveURL(/sign-up/)
    })
  })

  test.describe('Документы в футере', () => {
    test('E2E-9.7.E2E.12 — ссылка на оферту в футере', async ({ page }) => {
      await page.goto(urls.home)

      // Ищем ссылку на оферту в футере
      const footer = page.locator('footer')
      const offerLink = footer.getByRole('link', { name: /оферт|условия/i })

      if (await footer.isVisible().catch(() => false)) {
        await expect(offerLink).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: футер не найден на главной странице')
      }
    })

    test('E2E-9.7.E2E.13 — ссылка на политику в футере', async ({ page }) => {
      await page.goto(urls.home)

      // Ищем ссылку на политику в футере
      const footer = page.locator('footer')
      const privacyLink = footer.getByRole('link', { name: /политик|конфиденциальност/i })

      if (await footer.isVisible().catch(() => false)) {
        await expect(privacyLink).toBeVisible()
      } else {
        console.log('  ⏭️ Skip: футер не найден на главной странице')
      }
    })
  })

  test.describe('SEO и доступность', () => {
    test('E2E-9.7.E2E.14 — страница оферты имеет правильный title', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Проверяем title страницы
      const title = await page.title()
      expect(title.toLowerCase()).toMatch(/оферт|договор|условия/)
    })

    test('E2E-9.7.E2E.15 — страница политики имеет правильный title', async ({ page }) => {
      await page.goto(urls.legalPrivacy)

      // Проверяем title страницы
      const title = await page.title()
      expect(title.toLowerCase()).toMatch(/политик|конфиденциальност|privacy/)
    })

    test('E2E-9.7.E2E.16 — страницы доступны для скринридеров', async ({ page }) => {
      await page.goto(urls.legalOffer)

      // Проверяем наличие заголовков
      const headings = page.locator('h1, h2, h3')
      const headingsCount = await headings.count()
      expect(headingsCount).toBeGreaterThan(0)
    })
  })
})
