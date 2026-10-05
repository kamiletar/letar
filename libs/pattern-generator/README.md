# @letar/pattern-generator

Детерминированная генерация векторных узоров: проверка настроек, воспроизводимый ГПСЧ по seed и безопасная
сборка SVG. Чистый TypeScript без Node, React, Electron и Next.js — работает в браузере и на сервере одинаково.

Сами алгоритмы стилей (геометрия, волны, ветвление) строятся поверх этого ядра отдельными модулями.

## Установка

```typescript
import {
  createPatternRandom,
  createPatternSvg,
  formatPatternNumber,
  parsePatternConfig,
} from '@letar/pattern-generator'
```

## API

### `PatternConfigV1`

| Поле                 | Значение                               |
| -------------------- | -------------------------------------- |
| `version`            | `1`                                    |
| `style`              | `'geometry' \| 'waves' \| 'branching'` |
| `seed`               | целое `0…4 294 967 295`                |
| `widthMm`/`heightMm` | целые `100…3000`                       |
| `palette`            | `background` и 2…5 `colors`, `#RRGGBB` |
| `density`/`scale`    | целые `1…5`                            |

### `parsePatternConfig(input: unknown): PatternConfigV1`

Проверяет все поля, отсекает неизвестные, приводит цвета к верхнему регистру. Ошибка — обычный `Error` с русским
сообщением, пригодным для показа покупателю.

### `createPatternRandom(seed: number): () => number`

ГПСЧ xorshift32: один seed — одна последовательность значений `[0, 1)`. `Math.random`, время и системный
генератор не используются.

### `createPatternSvg(config, elements: string[]): string`

Внешний SVG: физический размер в мм, `viewBox="0 0 1000 H"` с сохранением пропорций, фон из палитры, затем элементы.
Низкоуровневый сборщик для доверенных алгоритмов, а не API загрузки SVG от клиента: элементы со скриптами,
ссылками, `url()`, обработчиками событий, шрифтами и `id` отвергаются.

### `formatPatternNumber(value: number): string`

Не больше трёх знаков после точки, без запятой, экспоненты и `-0`. `NaN`/`Infinity` — ошибка.

## Команды

```bash
nx test pattern-generator
nx lint pattern-generator
nx typecheck:tsgo pattern-generator
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/pattern-generator` в реальные `dependencies` приложения
(`workspace:*`) и запусти `bun install` — только так bun создаст симлинк в его `node_modules`.
