# PLAN_TESTING — Animatrona Folder Player

## Автоматические проверки

- [x] `nx test animatrona-folder-player` — vitest по чистой логике в `shared/`
      (46 тестов: детекция неподдерживаемых кодеков/контейнеров и эскалация плана
      транскодирования). Таргет inferred от плагина `@nx/vitest`, конфиг — `vitest.config.mts`.
- [x] `nx typecheck:tsgo animatrona-folder-player`, `nx lint animatrona-folder-player`,
      `nx build animatrona-folder-player` — зелёные.
- [x] Headless-прогон main-процесса без GUI:

      bun build main/services/ffmpeg/ffmpeg-installer.service.ts main/services/ffmpeg/transcode.service.ts shared/transcode-plan.ts --target=node --format=cjs --external electron --outdir scripts/.bundle
      ../../node_modules/.bin/electron.exe scripts/verify-ffmpeg.cjs

      Печатает статус ffmpeg (скачанный / системный / нет), недостающие декодеры и все четыре
      ветки эскалации с реальными аргументами ffmpeg. `npx electron` в этом монорепо падает на
      `EOVERRIDE` — звать бинарь напрямую (см. `.claude/rules/electron.md`).

## Ручная проверка

- [ ] `nx dev animatrona-folder-player` — окно открывается, интерфейс реагирует на клики
- [ ] `nx build:win animatrona-folder-player` — `dist/*.exe` собирается без ошибок
- [ ] Установленный `.exe` реально запускается и работает (GUI Electron не проверяется
      в сендбоксе Claude Code — см. `.claude/rules/electron.md` § «Грабли»)

### Расширенная поддержка форматов (Фаза 6) — только на реальных файлах

В песочнице нет ни MKV/MP4-фикстур, ни GUI, поэтому проверять на настоящих раздачах:

- [ ] Обычный H.264 8-бит + AAC играет как раньше — панель установки ffmpeg **не появляется**
      вообще, ни одного лишнего запроса в сеть
- [ ] Файл с AC3/DTS-звуком: панель предлагает включить расширенную поддержку → скачивание с
      прогрессом и работающей отменой → «Подготовить и проиграть» → файл играет со звуком,
      перемотка точная
- [ ] Файл Hi10P: то же, но с предупреждением о нескольких минутах; после подготовки картинка
      без артефактов
- [ ] Повторное открытие той же серии — стартует мгновенно (результат из кэша)
- [ ] Субтитры (внешние и встроенные) продолжают работать на подготовленном файле — они
      читаются из **оригинала**, не из копии
- [ ] Прогресс просмотра пишется на оригинальный путь, история не раздваивается
- [ ] Прерванная подготовка (отмена, закрытие окна) не оставляет файл, который кэш примет за
      готовый — в `userData/transcoded/` не должно остаться `*.part.mp4`
