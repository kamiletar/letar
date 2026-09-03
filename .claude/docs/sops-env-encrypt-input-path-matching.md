# SOPS: путь входного файла для creation_rules, дотенв vs бинарный формат `.enc`

Две грабли, на которые дважды подряд наступили при ручной точечной правке
`apps/<app>/.env.staging.enc` / `apps/<app>/.env.docker.enc` в сессии батч-фикса §33
`PLAN-INFRA-2.md` (2026-09-02). Обе не проявляются в штатном цикле `sops apps/<app>/.env.docker.enc`
(редактирование через `$EDITOR`, см. [secret-manager.md](/.claude/docs/secret-manager.md)) — только когда
скрипт сам создаёт промежуточный plaintext-файл с произвольным именем.

## Грабля 1 — `--encrypt --output` матчит creation_rules по ВХОДНОМУ пути

`.sops.yaml` в корне репозитория:

```yaml
creation_rules:
  - path_regex: \.env\.docker(\.enc)?$
    age: age1v0v...
  - path_regex: \.env\.staging(\.enc)?$
    age: age1v0v...
```

`sops --encrypt --output <out> <in>` выбирает `creation_rules` (а значит и age-получателя) по
регэкспу над путём **`<in>`**, не `<out>`. Промежуточный файл с именем вроде
`apps/kami/.env.staging.tmp` не совпадает ни с одним `path_regex` —

```
error loading config: no matching creation rules found for file "apps/kami/.env.staging.tmp"
```

— это **фатальная** ошибка (exit 1), выходной `.enc` не перезаписывается. Опасность не в самой
ошибке (она заметна), а в том, что цикл-скрипт без проверки exit code интерпретирует
«команда допечатала что-то в stdout/stderr и завершилась» как успех. Ровно так в этой сессии
20 из 20 первых попыток батч-правки тихо не записались — скрипт печатал «OK» безусловно, не
читая `$?` команды `sops`.

**Фикс:** промежуточный plaintext-файл должен иметь имя, буквально заканчивающееся на
`.env.staging` или `.env.docker` — `path_regex` не заякорен слева (`^`), только справа (`$`), так
что каталог, в котором лежит файл, роли не играет. `scripts/sops-env-set.sh` кладёт его в
изолированный `mktemp -d`, а не в `apps/<app>/`, — это одновременно и удовлетворяет регэксп, и
не рискует затереть чужую рабочую копию `.env.staging`/`.env.docker`, если она там уже лежит.

## Грабля 2 — два разных внутренних формата хранения `.enc`

У части файлов в репозитории (на 2026-09-02 подтверждено:
`apps/kami/.env.staging.enc`, `apps/dsperevod/.env.docker.enc`,
`apps/form-example/.env.staging.enc`) — **построчный dotenv-формат** sops: расшифрованный
результат выглядит как обычный `KEY=ENC[...]` на каждую переменную. У других (например
`apps/aboi/.env.docker.enc`) — **бинарный/JSON-обёрнутый формат**: весь файл на входе
шифрования не распознан как `.env`-подобный (расширение temp-файла в момент первого
`sops --encrypt` не заканчивалось ровно на `.env`), и sops завернул его целиком одним блобом.

Симптом при работе не тем режимом:

```
Error unmarshalling input json: invalid character 'P' looking for beginning of value
```

(первый символ в ошибке — первый символ реального plaintext, здесь `PORT=...`) — decrypt пытался
распарсить dotenv-контент как JSON-обёртку бинарного формата.

**Фикс — определять формат пробой, а не гадать по имени приложения:**

1. Сначала `sops --decrypt <file>` без флагов.
2. Если упал именно с `invalid character` (а не с другой ошибкой, например неверный ключ) —
   повторить с `sops --decrypt --input-type dotenv --output-type dotenv <file>`.
3. Какой вариант сработал — тем же вариантом (с теми же флагами `--input-type dotenv
   --output-type dotenv` или без них) шифровать обратно. Смешивать нельзя: бинарный decrypt +
   dotenv encrypt (или наоборот) даст файл, который никто из будущих читателей не откроет тем
   же способом, каким открывал раньше.

## Итоговый рецепт — `scripts/sops-env-set.sh`

```bash
scripts/sops-env-set.sh <app> <staging|docker> <KEY> <VALUE>
```

Делает оба фикса разом:

- decrypt во временный файл `$(mktemp -d)/.env.<staging|docker>` (грабля 1);
- пробует бинарный decrypt, при `invalid character` — dotenv-decrypt, запоминает, что сработало
  (грабля 2);
- правит/добавляет ключ через `awk` с чтением значения из `ENVIRON`, а не `awk -v` (значение
  секрета может содержать `\`-последовательности, которые `-v` трактует как escape);
- re-encrypt тем же форматом, что был на входе;
- проверяет `exit code` **каждой** команды `sops` (`set -euo pipefail` + явные `if`), не
  полагаясь на текст в stdout;
- в конце заново расшифровывает результат и печатает итоговое значение ключа — это и есть
  подтверждение успеха, а не факт «команда ничего не вывела в stderr».

Проверено вручную на обоих форматах (`apps/kami/.env.staging.enc` — dotenv,
`apps/aboi/.env.docker.enc` — binary) точечной no-op правкой существующего ключа и добавлением
нового ключа, с последующим откатом тестовой правки через `git checkout --`.

См. также [env-files.md](/.claude/rules/env-files.md) и [secret-manager.md](/.claude/docs/secret-manager.md).
