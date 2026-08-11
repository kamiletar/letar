# @letar/label-printer-core

Shared библиотека сервисов для печати этикеток "Честный знак" на термопринтерах TSC.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import {
  GS1Parser,
  ImageGeneratorService,
  PrinterService,
  TSPLService,
  ValidatorService,
} from '@letar/label-printer-core'
```

## API

### Парсеры

#### GS1Parser

Парсинг кодов маркировки "Честный знак" в формате GS1.

```typescript
import { GS1Parser } from '@letar/label-printer-core'

const result = GS1Parser.parse('010461234567890121ABC123\x1D93XXXX')
// {
//   gtin: '0461234567890',
//   serial: 'ABC123',
//   crypto: 'XXXX',
//   raw: '010461234567890121ABC123...'
// }
```

### Сервисы

#### ImageGeneratorService

Генерация изображений этикеток с DataMatrix кодом.

```typescript
import { ImageGeneratorService } from '@letar/label-printer-core'

// Инициализация (один раз)
await ImageGeneratorService.initialize()

// Генерация изображения
const imageBuffer = await ImageGeneratorService.generate(markingCode, {
  width: 400,
  height: 300,
  dpi: 203,
})
```

#### PrinterService

Абстракция для работы с принтерами.

```typescript
import { PrinterService } from '@letar/label-printer-core'

const printer = new PrinterService({
  type: 'windows', // 'mock' | 'windows'
  printerName: 'TSC TE210',
})

await printer.print(imageBuffer)
```

#### TSPLService

Генерация TSPL команд для принтеров TSC.

```typescript
import { TSPLService } from '@letar/label-printer-core'

const tspl = new TSPLService()
const commands = tspl.size(40, 30).gap(2, 0).speed(4).density(8).bitmap(0, 0, imageBuffer).print(1).build()
```

#### ValidatorService

Валидация кодов маркировки.

```typescript
import { ValidatorService } from '@letar/label-printer-core'

const isValid = ValidatorService.validate(code)
const errors = ValidatorService.getErrors(code)
```

### Модели

#### MarkingCode

```typescript
interface MarkingCode {
  gtin: string
  serial: string
  crypto?: string
  raw: string
  isValid: boolean
}
```

#### PrintJob

```typescript
interface PrintJob {
  id: string
  code: MarkingCode
  status: 'pending' | 'printing' | 'done' | 'error'
  createdAt: Date
  printedAt?: Date
}
```

### Конфигурация

```typescript
import { ConfigSchema, loadConfig } from '@letar/label-printer-core'

const config = loadConfig('path/to/config.json')
// Автоматическая валидация через Zod
```

### Утилиты

```typescript
import { ConsoleSpinner, Logger, PrintError } from '@letar/label-printer-core'

// Логирование
const logger = new Logger('MyService')
logger.info('Message')
logger.error('Error', error)

// Ошибки
throw new PrintError('Принтер недоступен', 'PRINTER_OFFLINE')

// Консольный индикатор
const spinner = new ConsoleSpinner('Печать...')
spinner.start()
spinner.stop()
```

## Структура

```
libs/label-printer-core/
├── src/
│   ├── config/          # Загрузка конфигурации
│   ├── models/          # TypeScript интерфейсы
│   ├── parsers/         # GS1Parser
│   ├── services/        # Сервисы печати
│   ├── utils/           # Logger, Errors
│   └── index.ts         # Публичный API
└── package.json
```

## Команды

```bash
nx build label-printer-core
nx test label-printer-core
nx lint label-printer-core
```

## Зависимости

| Пакет   | Назначение            |
| ------- | --------------------- |
| bwip-js | Генерация DataMatrix  |
| jimp    | Обработка изображений |
| winston | Логирование           |

---
