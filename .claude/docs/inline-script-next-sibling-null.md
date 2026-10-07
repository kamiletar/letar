# Inline-скрипт в SSR не видит следующий элемент — `nextElementSibling` всегда `null`

Скрипт «спрятать элемент до первой отрисовки» (по `localStorage`/cookie, которых SSR не знает)
нельзя писать как `document.currentScript.nextElementSibling.style.display = 'none'`.
Скрипт выполняется в момент разбора закрывающего `</script>`, а следующий элемент браузер ещё не
разобрал — `nextElementSibling` равен `null`, условие `if (b)` молча пропускает скрытие.
Проверка в браузере: `<script>parent.__sib = !!document.currentScript.nextElementSibling</script><div>x</div>` → `false`.

## Прецедент

`CookieBanner` (`@letar/ui`) в 0.25.1 прятал баннер у пользователя с принятым согласием именно так
и мигал при каждой перезагрузке. Фикс 0.25.1 проверяли чтением кода, а не в браузере — «работает»
не было видно ни в lint, ни в typecheck. Исправлено в 0.25.2.

## Как правильно

Скрипт кладёт в `<head>` правило по атрибуту, а у элемента этот атрибут стоит в серверной разметке:

```tsx
<script dangerouslySetInnerHTML={{ __html: `try{if(/* согласие есть */){var st=document.createElement('style');st.id='my-hide';st.textContent='[data-my-banner]{display:none!important}';document.head.appendChild(st)}}catch(e){}` }} />
<Box data-my-banner="" … />
```

Правило действует на элемент, как только тот появился в DOM. Если элемент потом должен снова
показываться (открыть настройки из футера), снимай `<style>` по `id`. Скрипт в `<head>` не трогает
разметку, которую гидратирует React, поэтому гидратационных предупреждений нет.

⚠️ Скрипт внутри React-компонента на клиентском рендере не выполняется (React 19 пишет в консоль
«Encountered a script tag while rendering React component») — это безвредно, если эффект
компонента делает то же самое после гидратации.

## Как проверять

Не по коду, а в браузере: в `iframe` повесить слушатель на `DOMContentLoaded` документа и
сравнить `getComputedStyle(элемент).display` с ожидаемым. Чтение `readyState` в цикле даёт
ложный результат: первым подвернётся пустой `about:blank`.
