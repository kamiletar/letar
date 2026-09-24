# Chakra v3 Drawer без `Positioner` и `Portal` рендерится внутри родителя

⚠️ Drawer открывается, закрывается, фокус-ловушка работает, typecheck и lint зелёные — но
панель живёт прямо в DOM-потоке того места, где объявлен `Drawer.Root`. Найдено в мобильном
меню archetest (аудит 2026-09-24, v0.28.0).

## Симптом

Меню объявлено внутри шапки (`<Header>` → `HStack` → `MobileDrawer`). При открытии:

- шапка раздувается по высоте на размер содержимого панели, логотип съезжает вниз;
- панель висит «коробкой» по высоте содержимого, а не на всю высоту экрана;
- затемнение фона есть (`Drawer.Backdrop` сам фиксированный), поэтому на первый взгляд «работает».

## Механизм

В Chakra v3 фиксированное позиционирование панели делает `Drawer.Positioner` (`position:
fixed; inset: 0` + выравнивание по `placement`), а не `Drawer.Content`. Без него `Content` —
обычный блок в потоке родителя. `Portal` уносит всё в конец `<body>`, чтобы родительские
`overflow`/`transform`/`z-index` не вмешивались.

## Правильная анатомия

```tsx
<Drawer.Root placement="end">
  <Drawer.Trigger asChild>…</Drawer.Trigger>
  <Portal>
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content>…</Drawer.Content>
    </Drawer.Positioner>
  </Portal>
</Drawer.Root>
```

Та же анатомия у `Dialog` (`Dialog.Positioner`).

## Как найти в репо

```bash
for f in $(grep -rlE "DrawerContent|Drawer\.Content" --include=*.tsx apps libs); do
  grep -qE "DrawerPositioner|Drawer\.Positioner" "$f" || echo "$f"
done
```

На 2026-09-24 нашлось два файла: мобильное меню archetest и `UpdateDrawer` animatrona (v0.56.3).
После обоих фиксов поиск пуст по всему репо, включая все 14 приватных submodule (выкачаны, проверено
в тот же день). Для Electron/nextron тот же `Portal` работает без особенностей: он уже стоит в
диалогах renderer animatrona.

Заметно только живым открытием на узком экране: скриншот закрытого состояния и unit-тесты
ничего не покажут.
