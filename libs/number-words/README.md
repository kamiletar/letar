# @letar/number-words

Конвертация чисел в слова (прописью). Поддержка множества локалей, включая RTL.

## Установка

```typescript
import { isSupportedLocale, numberToOrdinal, numberToWords } from '@letar/number-words'
```

## API

- `numberToWords(n, locale?)` — число в кардинальный текст (123 → "сто двадцать три")
- `numberToOrdinal(n, locale?)` — число в порядковый текст
- `isSupportedLocale(locale)` — проверка поддержки локали
- `isRtlLocale(locale)` — проверка RTL-локали
- `SUPPORTED_LOCALES` — список поддерживаемых локалей
- `RTL_LOCALES` — список RTL-локалей

## Зависимости

- `to-words` v5.3.0

---

**Версия:** 0.1.0
