# `oxlint-disable*` и `eslint-disable*` — раздельные неймспейсы, не взаимозаменяемые

**Симптом:** строка кода помечена `// oxlint-disable-next-line <правило>`, но `nx lint`
(конкретно его ESLint-проход) всё равно печатает предупреждение/ошибку по тому же правилу — как
будто директива не сработала вовсе.

## Причина

`nx lint` в этом монорепо — два независимых прохода (см. корневой `CLAUDE.md`, «Перед
коммитом»): сначала `oxlint` (fast-fail), затем ESLint. Каждый из них читает **свой** формат
inline-директив подавления:

- `oxlint-disable-next-line <правило>` — понимает только `oxlint`;
- `eslint-disable-next-line <правило>` — понимает только ESLint.

Совпадение имени правила в обеих директивах (например `react-hooks/exhaustive-deps`) не делает
их взаимозаменяемыми — это два разных инструмента со своими парсерами директив, один не читает
комментарии другого. Если правило реализовано в **обоих** линтерах одновременно (частый случай
для `react-hooks/*`: oxlint имеет собственную встроенную реализацию, а
`eslint-plugin-react-hooks` зарегистрирован отдельно в корневом `eslint.config.mjs`, см.
[eslint-flat-react-typescript-missing-react-hooks-plugin.md](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md)),
то одна директива гасит только половину предупреждения — вторая половина (от другого линтера)
остаётся видимой.

## Как понять, какому линтеру принадлежит правило

Два способа, оба быстрее, чем гадать по неймспейсу имени:

1. **Прогнать `nx lint <project>` и посмотреть, какой из двух проходов реально печатает
   предупреждение.** Оба прохода подписывают вывод — видно, oxlint это или ESLint.
2. **Свериться с конфигом oxlint проекта** (`.oxlintrc.json`, если он есть у
   приложения/библиотеки, иначе — корневой) на предмет наличия правила в списке включённых.
   Отсутствие правила там при живом предупреждении в `nx lint` — верный признак, что
   предупреждение печатает именно ESLint-проход.

Неймспейс в имени правила (`react/*`, базовые JS-правила) обычно намекает на oxlint, а
`react-hooks/*`, `@typescript-eslint/*` — на ESLint-плагины, но это эвристика, не гарантия:
`react-hooks/rules-of-hooks` и `react-hooks/exhaustive-deps` реализованы в **обоих** линтерах
одновременно (см. ссылку выше) — там нужна пара директив, а не выбор одной.

## Пример из этого репозитория

`libs/folder-player-react/src/lib/useWatchProgress.ts` и `useFolderHistory.ts` — оба хука имеют
эффект гидратации из внешнего хранилища при монтировании, и на одной строке `}, [])` требуются
**две разные** директивы для двух **разных** правил:

```typescript
useEffect(() => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) {
      // ...
      // oxlint-disable-next-line react/set-state-in-effect -- гидратация из хранилища (внешняя система)
      setProgressStorage(cleaned)
      // ...
    }
  } catch (error) {
    console.error('...', error)
  }
  // Загрузка только при монтировании — storage считается стабильным на весь жизненный цикл хоста
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- `react/set-state-in-effect` — правило React Compiler, есть только у `oxlint`. Гасится
  `oxlint-disable-next-line`, ESLint это правило вообще не проверяет.
- `react-hooks/exhaustive-deps` — правило `eslint-plugin-react-hooks`, зарегистрировано только
  в ESLint-конфиге (см. связанный документ). `oxlint-disable-next-line` его не подавляет, нужен
  `eslint-disable-next-line`.

Обе директивы стоят рядом, каждая гасит своё правило — это не дублирование, а необходимость.

## Найденные и исправленные случаи путаницы (2026-09-06)

При аудите репозитория (`grep -rn "oxlint-disable-next-line react-hooks"`) найдено 9 мест, где
`oxlint-disable-next-line react-hooks/exhaustive-deps` стоял **один**, без парной
`eslint-disable-next-line` — то есть гасил предупреждение только для oxlint, а ESLint-проход
`nx lint` продолжал бы его печатать:

- `apps/driving-school/src/app/_components/vehicles-manager.tsx`
- `apps/driving-school/src/app/_components/notification-bell.tsx` (2 места)
- `apps/driving-school/src/app/_components/horizontal-date-picker.tsx`
- `apps/driving-school/src/app/_components/district-input.tsx`
- `apps/driving-school/src/app/(chats)/chats/_hooks/use-socket-event.ts`
- `apps/driving-school/src/app/(chats)/chats/_hooks/use-presence.ts`
- `apps/mandala/src/app/[locale]/(main)/mandalas/[slug]/_hooks/use-event-listener.ts` (2 места,
  необычным синтаксисом `oxlint-disable-next-line eslint-plugin-react-hooks(exhaustive-deps)` —
  тоже только oxlint-неймспейс, ESLint его не читает)

Во всех случаях подавление `react-hooks/rules-of-hooks` в тех же приложениях (10 комбобоксов
`apps/driving-school/src/driving-school-form/comboboxes/*.tsx`) уже было исправлено правильно —
парная директива стояла с 2026-08-19 (см. связанный документ). Разошлись только более редкие
`exhaustive-deps`-подавления, добавленные, вероятно, до централизации плагина `react-hooks` в
ESLint или скопированные с более старого паттерна. Все 9 мест дополнены парной
`eslint-disable-next-line` тем же коммитом, что и этот документ.

## Дополнение 2026-09-06: третий класс — директива на правило, которое не проверяет НИ ОДИН линтер

Расширенный аудит (прогон `nx lint` на нескольких приложениях с разным профилем — обычный
Next.js, приложение со своим `.oxlintrc.json`-оверрайдом, Vue-либа — и сверка предупреждений с
существующими inline-директивами) нашёл иной класс путаницы, не описанный выше: директива
подавляет предупреждение, которого физически не может возникнуть — правило не подключено вовсе
ни в `.oxlintrc.json` (не входит ни в одну включённую категорию: `correctness` — единственная
включённая категория репозитория, `suspicious`/`perf` явно выключены, а
`react/no-array-index-key` относится к другой категории и отдельно нигде не включён), ни в
ESLint-конфиге (`eslint-plugin-react` зарегистрирован в `nx.configs['flat/react-typescript']`
(`react-jsx.js`) с явным точечным списком правил — `no-array-index-key` в него не входит).

Проверено эмпирически, не только по конфигу: копия файла без директивы прогнана и через
`oxlint --config .oxlintrc.json`, и через `bunx eslint` — оба линтера отработали с exit 0 и без
единой строки предупреждения. Значит директива не гасит вообще ничего ни в одном линтере —
мёртвый комментарий, а не пропущенная пара.

Найдено 7 мест с `(oxlint|eslint)-disable-next-line react/no-array-index-key` (и вариантом
полного имени `eslint-plugin-react/no-array-index-key` — oxlint принимает такой алиас, но это
не меняет того, что сама категория правила не включена):

- `apps/dashboard/src/app/_components/deploy/DeployProgress.tsx`
- `apps/dashboard/src/app/_components/shared/LogsDialog.tsx`
- `apps/dashboard/src/app/_components/ui/skeletons.tsx` (2 места)
- `apps/kami/src/app/[locale]/hire/_components/team-invite.tsx`
- `libs/admin-ui/src/table/inline-editable-table.tsx` (2 места, `eslint-disable-next-line`,
  но `@letar/admin-ui` вдобавок не имеет ни `eslint.config.mjs`, ни таргета `lint`/`oxlint`
  вовсе — эти строки не проверял никто ни разу)

Директивы удалены тем же коммитом, что и это дополнение — сам `key={index}` (обоснованно
безопасный для статичных/append-only списков) остался без изменений, убран только
неработающий комментарий-заглушка.

### Побочная находка при разборе (не баг, задокументировано на будущее)

При проверке версии `eslint-plugin-react-hooks` (7.1.1) обнаружилось, что её `configs.recommended`
в новой версии объединяет классические `rules-of-hooks`/`exhaustive-deps` с целым набором
React Compiler правил под тем же префиксом `react-hooks/*` (`react-hooks/set-state-in-effect`,
`react-hooks/refs`, `react-hooks/immutability` и т.д. — по сути дубли `react/*`-правил oxlint,
но под другим именем плагина). `nx.configs['flat/react-typescript']` (`react-jsx.js`)
формально подключает именно `configs.recommended.rules` для всех `.ts(x)`/`.js(x)` файлов —
на первый взгляд похоже на потенциальный источник массовой путаници (219 существующих
`oxlint-disable-next-line react/set-state-in-effect` без пары).

Проверено эмпирически (`eslint --print-config` на реальном файле с живым `set-state-in-effect`,
затем `bunx eslint` без директивы) — компилятор-правила `react-hooks/*` в мёрженом конфиге
отсутствуют вовсе, только `react-hooks/rules-of-hooks` и `react-hooks/exhaustive-deps`. Похоже,
`eslint_plugin_react_hooks_1.default.configs.recommended` в установленной сборке 7.1.1 не
экспортирует полный `recommendedRuleConfigs` там, где его берёт `react-jsx.js` (или берётся не
та ветка экспорта) — фактического дублирования нет. Действие не требуется, но при апгрейде
`eslint-plugin-react-hooks` эту связку стоит перепроверить тем же эмпирическим способом
(`--print-config`, не чтением исходников плагина), а не полагаться на код конфига.

## Связанное

- [eslint-flat-react-typescript-missing-react-hooks-plugin.md](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md) —
  почему `react-hooks/*` вообще резолвится в ESLint этого монорепо (централизованная
  регистрация плагина), и первое упоминание того же класса путаницы в разделе «Ловушка при
  включении».
- `apps/animatrona/PLAN_COMPLETED.md` (запись 2026-09-06, «Перенос renderer-части папочного
  плеера в libs») — где эта путаница была впервые замечена практически, при переносе
  `useWatchProgress`/`useFolderHistory` в `libs/folder-player-react`.
