# Semgrep-правила внутри приватного submodule

Кастомные semgrep-правила для приватного submodule-приложения живут в его собственном
`apps/<app>/.semgrep/letar-rules.yml`, а не в корневом `.semgrep/letar-rules.yml` letar. Две
причины, обе жёсткие:

1. **Submodule — отдельный git-репозиторий.** `apps/domwellbes` имеет свой `.git`
   (`git rev-parse --show-toplevel` внутри него = `C:/web/letar/apps/domwellbes`, не корень
   letar). Коммиты по файлам submodule (`apps/domwellbes/src/**`) идут ВНУТРИ этого репозитория.
   Pre-commit хук `scripts/hooks/pre-commit-semgrep.sh`, установленный в корне letar, эти коммиты
   не видит вообще — он сработал бы только на bump-коммите SHA submodule в letar-root, где диффа
   исходников уже нет. Правило в корневом `.semgrep/letar-rules.yml` с
   `paths: include: apps/domwellbes/**` в реальности **никогда** не сработало бы на настоящих
   коммитах domwellbes.
2. **Гигиена публичного репозитория.** Бизнес-логика приватного приложения (названия моделей,
   ролей, функций) в публичном файле letar нарушает
   [public-repo-hygiene.md](/.claude/rules/public-repo-hygiene.md).

## Как это работает механически

`scripts/hooks/pre-commit-semgrep.sh` резолвит путь к правилам так:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
RULES="$REPO_ROOT/.semgrep/letar-rules.yml"
```

Один и тот же скрипт копируется в каждый submodule через `scripts/hooks/install.sh
--all-submodules`. Запущенный внутри `apps/domwellbes`, `git rev-parse --show-toplevel`
возвращает корень **submodule**, а не letar — поэтому `RULES` резолвится в
`apps/domwellbes/.semgrep/letar-rules.yml`. Имя файла (`letar-rules.yml`) и относительный путь
(`.semgrep/`) совпадают с корневым намеренно: это не дублирование конфигурации, а один и тот же
относительный путь, интерпретируемый от разных git-корней. Сам скрипт менять не нужно — новый
файл подхватывается автоматически, если он существует.

## Образец

[`apps/domwellbes/.semgrep/letar-rules.yml`](/apps/domwellbes/.semgrep/letar-rules.yml) —
правило `domwellbes-projectmember-write-outside-service` (коммит `b4400952` в submodule
domwellbes). В шапке файла — та же аргументация, что здесь, плюс пример ручного прогона:

```bash
cd apps/domwellbes
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 uvx semgrep scan --config .semgrep/letar-rules.yml src
```

⚠️ На Windows без этих переменных semgrep читает YAML в системной cp1251 и падает
`UnicodeDecodeError` на кириллице в комментариях правил — `pre-commit-semgrep.sh` их уже
выставляет, ручной прогон вне хука их наследует только если задать явно.

## Когда заводить новый такой файл

Правило специфично для бизнес-логики одного приватного приложения (модели, роли, конкретные
сервисные функции) — не общий паттерн вроде SQL-инъекции или `dangerouslySetInnerHTML`.
Общие правила остаются в корневом `.semgrep/letar-rules.yml` и покрывают все приложения сразу
через `paths:`; per-submodule файл — только для того, что технически не может туда попасть
(причина 1) или не должно туда попадать по гигиене (причина 2).
