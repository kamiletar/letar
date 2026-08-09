# @letar/animatrona-franchise-graph

Компоненты графа франшиз для Animatrona (tracker + web). Визуализация связей между аниме: графовый, списочный и хронологический виды.

## Установка

Библиотека включена в монорепозиторий.

```typescript
import {
  computeChronologicalOrder,
  FranchiseGraphView,
  FranchiseListView,
  FranchiseTimelineView,
  useFranchiseGraph,
} from '@letar/animatrona-franchise-graph'
```

## API

### Компоненты

- `FranchiseGraphView` — интерактивный граф связей
- `FranchiseListView` — табличное представление
- `FranchiseTimelineView` — хронологическая шкала
- `AnimeNode` — узел графа (аниме)
- `RelationEdge` — ребро графа (связь)

### Хуки и утилиты

- `useFranchiseGraph()` — состояние графа
- `computeChronologicalOrder()` — хронологическая сортировка
- `KIND_COLORS`, `KIND_LABELS`, `RELATION_LABELS` — константы

## Команды

```bash
nx build animatrona-franchise-graph
nx test animatrona-franchise-graph
nx lint animatrona-franchise-graph
```

---

