# @letar/contract-generator

Библиотека для генерации PDF документов (договоры, акты, счета) с поддержкой Handlebars шаблонов.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { ... } from '@letar/contract-generator'
```

## Возможности

- Генерация PDF через Puppeteer (HTML → PDF)
- Генерация PDF через @react-pdf/renderer
- Шаблонизация через Handlebars
- Типизированные данные для шаблонов

## API

### Основной экспорт

```typescript
import { ContractData, generateContract } from '@letar/contract-generator'

const pdf = await generateContract({
  template: 'service-agreement',
  data: {
    clientName: 'ООО Рога и копыта',
    contractNumber: '123/2026',
    date: new Date(),
    // ...
  },
})
```

### PDF через Puppeteer

```typescript
import { generatePdf } from '@letar/contract-generator/pdf-generator'

const pdf = await generatePdf({
  html: '<html>...</html>',
  options: {
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm' },
  },
})
```

### PDF через React PDF

```typescript
import { ContractDocument } from '@letar/contract-generator/pdf-react'
import { renderToBuffer } from '@react-pdf/renderer'

const buffer = await renderToBuffer(
  <ContractDocument data={contractData} />,
)
```

## Шаблоны

Шаблоны находятся в `src/templates/`:

| Шаблон            | Описание               |
| ----------------- | ---------------------- |
| service-agreement | Договор оказания услуг |
| invoice           | Счёт на оплату         |
| act               | Акт выполненных работ  |

### Создание шаблона

```handlebars
<!-- src/templates/my-template.hbs -->
<html>
  <body>
    <h1>Договор №{{contractNumber}}</h1>
    <p>Клиент: {{clientName}}</p>
    <p>Дата: {{formatDate date}}</p>
  </body>
</html>
```

## Хелперы Handlebars

| Хелпер        | Описание             |
| ------------- | -------------------- |
| `formatDate`  | Форматирование даты  |
| `formatMoney` | Форматирование суммы |
| `pluralize`   | Склонение слов       |

## Команды

```bash
nx build contract-generator
nx test contract-generator
nx lint contract-generator
```

## Зависимости

- `handlebars` — шаблонизатор
- `puppeteer` (peer, optional) — для HTML → PDF
- `@react-pdf/renderer` (peer, optional) — для React PDF

---
