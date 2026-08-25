# `useTransition().isPending` — синхронно `false` до первого тика эффекта

## Симптом

Компонент грузит данные внутри `useEffect`, оборачивая запрос в `startTransition`, и решает,
что показать, по `isPending`:

```tsx
const [isPending, startTransition] = useTransition()
const [data, setData] = useState<T | null>(null)

useEffect(() => {
  startTransition(async () => {
    setData(await fetchSomething())
  })
}, [])

// ⚠️ на первом кадре: data === null И isPending === false одновременно
return data ? <Real data={data} /> : isPending ? <Loading /> : <Fallback />
```

На **первом рендере** `data` ещё `null`, а `isPending` — синхронно `false`: `startTransition`
вызывается только внутри тела `useEffect`, который исполняется уже **после** первого коммита и
браска. В этом окне (от монтирования до первого тика эффекта) код проваливается в ветку
`Fallback`, хотя на самом деле «мы просто ещё не начали грузить» — не то же самое, что «есть
подтверждённая причина показать fallback» (ошибка, финальное пустое состояние и т.п.).

## Где действительно ловится

Только там, где вычислительная/сетевая работа **триггерится эффектом** (не кликом/сабмитом) и
результат отображается с осмысленной веткой-заменителем (не skeleton/`null`). Компонент с
`if (isPending) return <Spinner/>` без второй развилки не подвержен — там при `isPending===false`
и пустых данных просто ничего не рендерится или рендерится тот же лоадер по другому условию.

Подтверждённые находки:

- **domwellbes** — `apps/domwellbes/src/app/houses/[slug]/configure/_components/configurator.tsx`
  (конфигуратор дома, публичная страница). Тернарник вида
  `price ? real : isPending ? 'считаем...' : formatKopecks(basePriceKopecks)` на первом кадре
  показывал устаревшую базовую цену вместо индикатора загрузки. Разбор — `PLAN_PUBLIC_MOBILE.md`
  §12.10 (submodule, недоступен из публичного репо).
- **kami** — `apps/kami/src/app/[locale]/consulting/_components/slot-picker.tsx` (виджет выбора
  слота для консультации, публичная форма записи). Условие `if (isPending && !hasSlots)` на
  первом кадре ложно: `isPending===false`, `hasSlots===false` → компонент проваливался в ветку
  «Нет доступных слотов. Свяжитесь напрямую» вместо спиннера загрузки, пока эффект не успевал
  стартовать `startTransition`.

Аудит по всему монорепо (grep `isPending`/`useTransition` в связке с `useEffect`+`startTransition`,
~204 файла с `useTransition`) других экземпляров не нашёл — подавляющее большинство использований
`isPending` в репозитории относятся к клик-триггеренным мутациям/сабмитам (кнопка-лоадер), где
эта гонка не воспроизводится, потому что `startTransition` вызывается синхронно в обработчике
клика, а не отложенно в эффекте.

## Фикс

Не полагаться на `isPending` как на маркер «загрузка ещё не начиналась». Либо:

1. **Развернуть приоритет веток** — fallback показывать только на подтверждённую причину
   (ошибку), а не как реакцию на «данных пока нет»:

   ```tsx
   {
     price ? real : error ? staleFallback : 'считаем...'
   }
   ```

2. **Завести отдельный флаг «первая загрузка завершилась»**, не зависящий от `isPending`:

   ```tsx
   const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

   useEffect(() => {
     startTransition(async () => {
       setData(await fetchSomething())
       setHasLoadedOnce(true)
     })
   }, [])

   if (!hasLoadedOnce) { return <Loading /> }
   if (!hasData) { return <EmptyState /> }
   ```

   Предпочтительнее, когда ветки — не «реальные данные vs ошибка», а «реальные данные vs
   легитимное пустое состояние» (как в `slot-picker.tsx` — «нет слотов» не ошибка).

## Как искать похожее

```bash
grep -rln 'useTransition' apps/*/src libs/*/src --include='*.tsx' \
  | xargs grep -l 'useEffect'
```

Дальше вручную: интересны только файлы, где `startTransition` вызывается **внутри** `useEffect`
(не в обработчике клика/сабмита), и где `isPending` участвует в выборе JSX-ветки с более чем
одним альтернативным состоянием (не просто `opacity={isPending ? 0.7 : 1}` или лейбл кнопки).
