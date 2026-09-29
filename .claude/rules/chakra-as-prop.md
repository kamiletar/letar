# ⛔ Chakra: проп `as=` запрещён — только `asChild`

> Правило намеренно без `paths:`. Компоненты с Chakra пишут в `page.tsx`, `layout.tsx`,
> `src/components/**` и где угодно, а path-scoped правило не инжектится при `Write`
> ([claude-code#23478](https://github.com/anthropics/claude-code/issues/23478)). Пока запрет
> жил в `components.md` с `paths: apps/**/_components/**, libs/ui/**`, агенты его не видели и
> повторяли `as=` за соседним кодом (~750 старых вхождений в ~400 файлах на 2026-09-29).

`as="…"` и `as={Component}` на любом компоненте с большой буквы **не писать**. Вместо этого
`asChild` + ровно один нативный элемент (или компонент ссылки) внутри:

```tsx
<Heading as="h1" size="xl">…</Heading>   →  <Heading asChild size="xl"><h1>…</h1></Heading>
<Box as="button" onClick={f} w={8} />     →  <Box asChild w={8}><button type="button" onClick={f} /></Box>
<Link as={NextLink} href="/x">…</Link>   →  <Link asChild><NextLink href="/x">…</NextLink></Link>
<Icon as={LuX} boxSize={4} />           →  <LuX size={16} />
```

- Стили — на Chakra-компоненте, HTML-атрибуты и обработчики — на нативном теге.
- У `asChild` ровно один ребёнок, остальные молча пропадают
  ([разбор](/.claude/docs/chakra-aschild-multiple-children-silent-drop.md)).
- `as="label"` → `<label htmlFor>` и `<input id>` соседями, не вложенными
  ([components.md](/.claude/rules/components.md), раздел про антипаттерн с `<label>`).
- Старый `as=` в соседнем коде — долг, а не образец.

**Барьеры:** PostToolUse-хук `.claude/hooks/chakra-as-prop-check.js` сразу после Write/Edit
возвращает замечание на каждое **новое** вхождение (старые не трогает); semgrep
`letar-chakra-as-prop-forbidden` — при коммите, пока WARNING. Рецепт чистки старого и кодмод
для `Icon as=` — [chakra-icon-as-prop-cleanup-pattern](/.claude/docs/chakra-icon-as-prop-cleanup-pattern.md).
