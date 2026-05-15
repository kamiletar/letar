# Артефакты — .claude/artifacts/

Все временные файлы, создаваемые в процессе работы, сохраняй в `.claude/artifacts/`. Папка в `.gitignore`.

## Что сюда попадает

- **Скриншоты** (preview_screenshot, Claude in Chrome save_to_disk)
- **GIF-записи** (gif_creator export)
- **Экспорты данных** (CSV, JSON для анализа)
- **Временные файлы** (промежуточные артефакты сборки, дампы)

## Как использовать

```
# Preview screenshot
preview_screenshot → файл попадает в рабочую директорию

# Claude in Chrome — указывай путь явно
computer(action: "screenshot", save_to_disk: true) → сохраняется автоматически

# Playwright — указывай filename
browser_take_screenshot(filename: ".claude/artifacts/check.png")
```

## Правила

- **НЕ сохраняй** артефакты в корень репо или в папки приложений
- **Периодически чисти** — файлы накапливаются между сессиями
- Если нужно показать скриншот пользователю — сохраняй сюда, потом ссылайся на путь
