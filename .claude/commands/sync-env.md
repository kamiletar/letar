# Двусторонняя синхронизация .env.docker

Синхронизируй `.env.docker` файлы между локальной машиной и production серверами.

## Аргументы

- Без аргументов: все приложения
- `<app-name>`: конкретное приложение (например, `premium-rosstil`)
- `--push`: только push (локальные → серверы), без интерактива
- `--pull`: только pull (серверы → локальные), без интерактива

## Workflow (интерактивный режим, по умолчанию)

Для каждого приложения:

1. Скачай remote `.env.docker` с production сервера во временный файл через `pull-env-docker.sh`
2. Сравни с локальным файлом `apps/<app>/.env.docker`
3. Если файлы **идентичны** — пропусти, выведи `= <app> — синхронизирован`
4. Если есть **различия** — покажи diff и спроси пользователя через AskUserQuestion:
   - **Push** — записать локальную версию на сервер
   - **Pull** — скачать серверную версию локально
   - **Skip** — пропустить
5. Применить выбранное действие

## Серверы и приложения

| Сервер | Хост               | Приложения                                                                               |
| ------ | ------------------ | ---------------------------------------------------------------------------------------- |
| s1     | root@s1.letar.best | premium-rosstil, imot, mandala, kami, pravda, umami, animatrona-landing, dashboard-agent |
| s2     | root@s2.letar.best | dashboard, driving-school, animatrona-web, animatrona-tracker                            |

## Скрипты

- **Push:** `./scripts/sync-env-docker.sh [app-name]` — загрузить локальные на серверы
- **Pull:** `./scripts/pull-env-docker.sh [app-name] [--apply]` — скачать с серверов локально

## SSH

На Windows использовать системный SSH:

```bash
/c/Windows/System32/OpenSSH/ssh.exe -i ~/.ssh/id_rsa
/c/Windows/System32/OpenSSH/scp.exe -i ~/.ssh/id_rsa
```

## Реализация

Используй bash-скрипты для скачивания/загрузки, но **решения о направлении** принимай через AskUserQuestion. Не используй `--apply` автоматически — всегда показывай diff перед применением.

### Алгоритм

```
для каждого приложения:
  server = определи сервер (s1 или s2)
  remote = скачай .env.docker с сервера во /tmp
  local = apps/<app>/.env.docker

  если remote == local:
    вывести "= <app> — синхронизирован"
  иначе если remote не существует:
    предложить push
  иначе если local не существует:
    предложить pull
  иначе:
    показать diff
    спросить: push / pull / skip
```

### Push одного приложения

```bash
/c/Windows/System32/OpenSSH/scp.exe -i ~/.ssh/id_rsa apps/<app>/.env.docker root@<server>:/home/deploy/lena/apps/<app>/.env.docker
```

### Pull одного приложения

```bash
/c/Windows/System32/OpenSSH/scp.exe -i ~/.ssh/id_rsa root@<server>:/home/deploy/lena/apps/<app>/.env.docker apps/<app>/.env.docker
```

## После синхронизации

Напомни пользователю передеплоить затронутые приложения, если были push-изменения.
