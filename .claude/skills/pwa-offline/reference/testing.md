# Testing

Тестирование PWA offline-функциональности.

## DevTools

### Application Panel

1. **Service Workers** — статус SW, обновление, unregister
2. **Cache Storage** — просмотр кэшированных ресурсов
3. **IndexedDB** — просмотр данных TanStack Query и очереди синхронизации
4. **Storage** — общее использование хранилища

### Network Panel

1. **Offline** — эмуляция оффлайн режима (checkbox)
2. **Throttling** — эмуляция медленной сети
   - Slow 3G — 400 Kbps
   - Fast 3G — 1.4 Mbps
3. **Disable cache** — отключение браузерного кэша

---

## Эмуляция оффлайн

### Chrome DevTools

1. Открыть DevTools (F12)
2. Network → Offline (checkbox)
3. Или: Application → Service Workers → Offline

### Playwright

```typescript
// Эмуляция оффлайн
await context.setOffline(true)

// Выполнить действие оффлайн
await page.click('[data-testid="submit-button"]')
expect(await page.locator('[data-testid="offline-indicator"]')).toBeVisible()

// Восстановить соединение
await context.setOffline(false)

// Проверить синхронизацию
await expect(page.locator('[data-testid="sync-status"]')).toContainText('Синхронизация')
```

### Vitest

```typescript
// Мок navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: false,
  writable: true,
})

// Эмуляция события
window.dispatchEvent(new Event('offline'))

// Проверка
expect(result.current.isOffline).toBe(true)
```

---

## Чеклист тестирования

### Статика (Service Worker)

- [ ] Главная страница загружается оффлайн
- [ ] CSS и JS загружаются из кэша
- [ ] Изображения отображаются из кэша
- [ ] `/offline` страница показывается при ошибке навигации
- [ ] Шрифты загружаются оффлайн
- [ ] `manifest.json` доступен

### Данные (TanStack Query + IndexedDB)

- [ ] Каталог показывает кэшированные товары
- [ ] Страница товара загружается из кэша
- [ ] История заказов доступна оффлайн
- [ ] Профиль пользователя сохраняется в IndexedDB
- [ ] Избранное работает оффлайн
- [ ] Данные обновляются при восстановлении сети

### Формы (useOfflineForm)

- [ ] Форма отправляется в очередь при оффлайн
- [ ] `onQueued` callback вызывается
- [ ] Индикатор показывает количество ожидающих
- [ ] При восстановлении сети данные синхронизируются
- [ ] `onSuccess` вызывается после синхронизации
- [ ] Ошибки 4xx помечают элемент как FAILED
- [ ] Ошибки сети приводят к retry

### UI индикаторы

- [ ] `FormOfflineIndicator` появляется при оффлайн
- [ ] `FormOfflineIndicator` скрывается при онлайн
- [ ] `FormSyncStatus` показывает количество ожидающих
- [ ] Spinner показывается при синхронизации
- [ ] Баннер появляется при потере связи
- [ ] Баннер показывает восстановление на 3 секунды

---

## Примеры E2E тестов

### Отправка формы оффлайн

```typescript
test('форма сохраняется в очередь при оффлайн', async ({ page, context }) => {
  // Переходим на страницу формы
  await page.goto('/profile')

  // Эмуляция оффлайн
  await context.setOffline(true)

  // Проверяем индикатор
  await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()

  // Заполняем форму
  await page.fill('[name="name"]', 'Новое имя')

  // Отправляем
  await page.click('[type="submit"]')

  // Проверяем уведомление о сохранении в очередь
  await expect(page.locator('.chakra-toast')).toContainText('Сохранено локально')

  // Проверяем счётчик очереди
  await expect(page.locator('[data-testid="sync-status"]')).toContainText('Ожидает: 1')
})
```

### Синхронизация при восстановлении

```typescript
test('очередь синхронизируется при восстановлении сети', async ({ page, context }) => {
  // Сохраняем форму оффлайн (из предыдущего теста)
  await page.goto('/profile')
  await context.setOffline(true)
  await page.fill('[name="name"]', 'Новое имя')
  await page.click('[type="submit"]')

  // Восстанавливаем соединение
  await context.setOffline(false)

  // Ждём синхронизации
  await expect(page.locator('[data-testid="sync-status"]')).toContainText('Синхронизация')

  // Проверяем успешную синхронизацию
  await expect(page.locator('.chakra-toast')).toContainText('Профиль сохранён')

  // Индикатор очереди скрывается
  await expect(page.locator('[data-testid="sync-status"]')).not.toBeVisible()
})
```

### Кэширование страниц

```typescript
test('страница товара доступна оффлайн после посещения', async ({ page, context }) => {
  // Первый визит — загружаем в кэш
  await page.goto('/products/dress-123')
  await expect(page.locator('h1')).toContainText('Платье')

  // Переходим оффлайн
  await context.setOffline(true)

  // Перезагружаем страницу
  await page.reload()

  // Страница загружается из кэша
  await expect(page.locator('h1')).toContainText('Платье')
})
```

---

## Тестирование Storage Quota

```typescript
test('предупреждение при заполнении хранилища', async ({ page }) => {
  // Заполняем IndexedDB большим количеством данных
  await page.evaluate(async () => {
    const { set } = await import('idb-keyval')
    const largeData = 'x'.repeat(10 * 1024 * 1024) // 10 MB
    await set('test-large', largeData)
  })

  // Проверяем виджет хранилища
  await expect(page.locator('[data-testid="storage-info"]')).toContainText(/\d+.*MB/)
})
```

---

## Что кэшируем (read-only для просмотра оффлайн)

| Данные                | Кэшируем | Причина                          |
| --------------------- | -------- | -------------------------------- |
| Каталог товаров       | ✅       | Просмотр оффлайн                 |
| История заказов       | ✅       | Пользователь изучает свои заказы |
| Профиль, мерки        | ✅       | Личные данные                    |
| Избранное             | ✅       | Локальное состояние              |
| История платежей      | ✅       | Без полных номеров карт          |
| Полные номера карт    | ❌       | Безопасность                     |
| CVV, платёжные токены | ❌       | Безопасность                     |
| `/auth/*`             | ❌       | Авторизация требует сервер       |

---

## Осторожно с мутациями оффлайн

| Действие           | Риск                                     | Рекомендация                            |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| Создание заказа    | Товар может закончиться, цена измениться | Проверять при синхронизации, уведомлять |
| Оплата             | Платёжная сессия истекает                | Только онлайн                           |
| Бронирование       | Слот может быть занят                    | Проверять при синхронизации             |
| Обновление профиля | Минимальный риск                         | Безопасно                               |

---

## См. также

- [form-components-offline.md](form-components-offline.md) — useOfflineForm
- [sync-queue.md](sync-queue.md) — Очередь синхронизации
- [service-worker.md](service-worker.md) — SW тестирование
