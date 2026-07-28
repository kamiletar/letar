# @letar/analytics

Библиотека для подключения Umami аналитики к Next.js приложениям.

## Установка

Библиотека уже включена в монорепо. Добавь в `tsconfig.json` приложения:

```json
{
  "references": [{ "path": "../../libs/analytics" }]
}
```

## Использование

### 1. Добавить переменные окружения

В `.env` файл приложения:

```bash
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<your-website-id>
```

### 2. Добавить в layout.tsx

```tsx
import { UmamiScript } from '@letar/analytics'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <UmamiScript />
      </body>
    </html>
  )
}
```

### 3. (Опционально) С явными параметрами

```tsx
<UmamiScript scriptUrl="https://stats.letar.best/script.js" websiteId="abc-123" />
```

### 4. Согласие на аналитику (152-ФЗ)

`hasConsent` работает как в `@letar/yandex-metrika`: `undefined` — грузить сразу (обратная
совместимость), `false` — не грузить, `true` — грузить. В приложениях с `CookieBanner` из
`@letar/ui` оборачивай `UmamiScript` в consent-aware компонент — образец:
`apps/dsperevod/src/app/_components/yandex-metrika-consent.tsx`.

```tsx
<UmamiScript hasConsent={hasConsent} />
```

## API

### UmamiScript

| Prop         | Тип        | Описание                                                                                   |
| ------------ | ---------- | ------------------------------------------------------------------------------------------ |
| `scriptUrl`  | `string?`  | URL скрипта (по умолчанию из `NEXT_PUBLIC_UMAMI_SCRIPT_URL`)                               |
| `websiteId`  | `string?`  | Website ID (по умолчанию из `NEXT_PUBLIC_UMAMI_WEBSITE_ID`)                                |
| `hasConsent` | `boolean?` | Согласие на аналитику. `undefined` — грузить сразу, `false` — не грузить, `true` — грузить |

## Получение Website ID

1. Открыть https://stats.letar.best
2. Settings → Websites → Add website
3. Указать название и домен
4. Скопировать Website ID
