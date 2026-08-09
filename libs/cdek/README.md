# @letar/cdek

Доменно-нейтральный клиент СДЭК API v2 + готовые UI-компоненты выбора пункта выдачи (ПВЗ).
Не привязан к конкретному приложению — каждый потребитель сам строит габариты посылки и
серверные экшны, библиотека даёт только сам протокол СДЭК и карту/список ПВЗ.

Единственный текущий потребитель — `apps/svoichuzhie` (доставка мерча).

## Установка

Библиотека уже включена в монорепозиторий. Два входа: `.` — серверный клиент (Node-only,
работает с `fetch`/`process.env`), `./client` — React UI-компоненты (`'use client'`).

```typescript
import { calculateTariffs, getDeliveryPoints, searchCdekCities } from '@letar/cdek'
import type { CdekShippingCosts, DadataCitySuggestion } from '@letar/cdek'
import { PvzPicker } from '@letar/cdek/client'
```

## Переменные окружения

| Переменная              | Назначение                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CDEK_CLIENT_ID`        | OAuth client_id СДЭК API v2                                                                                                                   |
| `CDEK_CLIENT_SECRET`    | OAuth client_secret                                                                                                                           |
| `CDEK_FROM_POSTAL_CODE` | Индекс отправителя (дефолт `140013`)                                                                                                          |
| `CDEK_FROM_CITY`        | Город отправителя (дефолт `Москва`)                                                                                                           |
| `CDEK_FROM_ADDRESS`     | Адрес отправителя (дефолт `Рождественская ул., 8`)                                                                                            |
| `CDEK_TEST_MODE=true`   | Переключает `getBaseUrl()` на `api.edu.cdek.ru` (тестовый контур)                                                                             |
| `CDEK_MOCK_MODE=true`   | Отключает реальные запросы к СДЭК — все функции отдают фиктивные данные (`MOCK_PVZ`, 15 городов Москвы) с искусственной задержкой, без токена |

Без `CDEK_CLIENT_ID`/`CDEK_CLIENT_SECRET` серверные функции возвращают `null`/пустой
результат вместо ошибки — вызывающий код должен обрабатывать это как «СДЭК недоступен»,
а не падать.

## API — серверный клиент (`.`)

### `getCdekToken(): Promise<string | null>`

OAuth-токен (`client_credentials`), кэшируется в памяти процесса с буфером 5 минут до
истечения. `null`, если нет `CDEK_CLIENT_ID`/`CDEK_CLIENT_SECRET` или запрос не удался.

### `calculateTariffs(to, pkg, from?): Promise<CdekShippingCosts>`

Рассчитывает стоимость по двум тарифам — ПВЗ (136) и дверь (137). `pkg` — только габариты
(`CdekPackageDims`: вес/длина/ширина/высота), без товарного состава — каждое приложение
строит их из своей доменной логики (см. пример `estimateMerchPackage` в `svoichuzhie`).
Суммы — в копейках. При недоступности СДЭК возвращает `{ point: null, door: null, ...,
error: 'CDEK_NO_TOKEN' | 'HTTP_ERROR' | 'FETCH_ERROR' }` — не бросает исключение.

```typescript
// apps/svoichuzhie/src/app/_actions/shipping.action.ts
const result = await calculateTariffs(toLocation, pkg)
const fallback = result.point === null && result.door === null
```

### `searchCdekCities(query): Promise<CdekCityItem[]>`

Поиск городов СДЭК по подстроке (до 10 результатов).

### `getCityCodeByPostalCode(postalCode): Promise<number | null>`

Резолв `city_code` СДЭК по почтовому индексу.

### `getDeliveryPoints(cityCode): Promise<CdekDeliveryPoint[]>`

Список ПВЗ (`type: 'PVZ'`, `is_handout: true`) по `city_code`, до 300 точек.

### `createCdekOrder(request): Promise<{ uuid, trackNumber? } | { error: string }>`

Создаёт заказ СДЭК. `error` — уже человекочитаемое сообщение (склеенные ошибки СДЭК API,
сетевая ошибка или не-JSON ответ) — можно отдавать напрямую пользователю/в лог.

### `getCdekOrderStatus(cdekUuid): Promise<CdekOrderStatusResponse['entity'] | null>`

Статусы заказа по UUID (для сверки с вебхуком или ручного опроса).

### `ensureCdekWebhook(url): Promise<boolean>`

Идемпотентная регистрация вебхука `ORDER_STATUS` — сначала проверяет список существующих
вебхуков СДЭК, не создаёт дубликат.

### `getFromLocation(): CdekLocation`

Адрес отправителя из ENV — используется как дефолт в `calculateTariffs`, если `from` не передан.

## API — UI-компоненты (`./client`)

### `<PvzPicker />`

Composite-компонент: поиск города (через переданный извне `searchCities`, DaData-подобный
API) → резолв в СДЭК-город → список/карта ПВЗ с фильтром → выбор точки. Библиотека не знает
о конкретном Next.js-приложении — все серверные вызовы передаются через проп `actions`:

```typescript
export interface PvzPickerActions {
  searchCities: (query: string) => Promise<DadataCitySuggestion[]>
  getDeliveryPoints: (cityCode: number) => Promise<DeliveryPointsResult>
  getCdekCityByName: (name: string) => Promise<CdekCityItem | null>
  getCityByCoordinates: (lat: number, lng: number) => Promise<CdekCityItem | null>
}
```

```tsx
// apps/svoichuzhie/src/app/merch/checkout/_components/delivery-section.tsx
import type { DadataCitySuggestion } from '@letar/cdek'
import { PvzPicker } from '@letar/cdek/client'

const pvzPickerActions = {
  searchCities: searchDadataCitiesAction,
  getDeliveryPoints: getDeliveryPointsByCityCodeAction,
  getCdekCityByName: getCdekCityByNameAction,
  getCityByCoordinates: getCityByCoordinatesAction,
}
<PvzPicker actions={pvzPickerActions} selectedPvzCode={pvzCode} onSelect={handleSelect} />
```

`onSelect(code, address, postalCode)` — вызывается при выборе/снятии выбора ПВЗ (пустые
строки при снятии). `colorPalette` — Chakra semantic token для подсветки выбранной точки
(дефолт `gray`).

### `<PvzMap />`

Интерактивная карта на Leaflet/OpenStreetMap с маркерами ПВЗ — используется `PvzPicker`
внутри через `next/dynamic({ ssr: false })` (Leaflet не работает при SSR). Можно
использовать отдельно, если нужна только карта без поиска города.

## Зависимости

`leaflet` + `react-leaflet` — обязательные `dependencies` (не peer), тянутся вместе с
библиотекой. Peer-зависимости — `@chakra-ui/react`, `next`, `react`, `react-dom` (версии
берутся из приложения-потребителя).

## Команды

```bash
nx test cdek
nx lint cdek
nx typecheck:tsgo cdek
```

## Подключение к приложению

Добавь `@letar/cdek` в `nx.implicitDependencies` в `package.json` приложения. Подробности
и грабли с `paths`/`references` — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).
