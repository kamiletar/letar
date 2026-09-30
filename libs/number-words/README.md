# @letar/number-words

Конвертация чисел в слова (прописью). Поддержка множества локалей, включая RTL.

## Установка

```bash
npm i @letar/number-words@beta
```

```typescript
import { isSupportedLocale, numberToOrdinal, numberToWords } from '@letar/number-words'
```

## API

- `numberToWords(n, locale)` — число в кардинальный текст (`numberToWords(123, 'ru')` → "сто двадцать три")
- `numberToOrdinal(n, locale)` — число в порядковый текст
- `isSupportedLocale(locale)` — проверка поддержки локали
- `isRtlLocale(locale)` — проверка RTL-локали
- `SUPPORTED_LOCALES` — список поддерживаемых локалей
- `RTL_LOCALES` — список RTL-локалей

## Зависимости

- `to-words` v5.3.0
