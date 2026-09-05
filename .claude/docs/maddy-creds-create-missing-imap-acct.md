# Maddy: `creds create` не создаёт почтовый ящик — нужен ещё `imap-acct create`

## Симптом

Новый локальный адрес (`<новый>@letar.best`) заведён командой `docker exec maddy maddy creds
create <адрес>` (документированная команда «создать пользователя» — `email.md`,
`email-maddy/SKILL.md`, `email-maddy/reference/maddy-config.md`). SMTP-аутентификация под этим
адресом работает. Но любое письмо, отправленное **на** этот адрес, отклоняется на приём:

```
501 5.1.1 User does not exist
```

— даже при том, что `maddy creds list` показывает адрес существующим, а домен давно есть в
`$(local_domains)`.

## Причина

Конфиг сервера (`data/maddy.conf`, см. `maddy-config.md`) разводит два независимых механизма:

- **`auth.pass_table local_authdb`** (SQLite `credentials.db`) — кого пускать по SMTP/IMAP
  логину/паролю. Это то, что создаёт `maddy creds create`.
- **`storage.imapsql local_mailboxes`** (SQLite `imapsql.db`) — куда реально доставляется почта
  (`deliver_to &local_mailboxes` в блоках `submission`/`smtp` и хранилище для `imap`). Учётная
  запись в этом хранилище создаётся **отдельной** командой `maddy imap-acct create <адрес>`.

Сама CLI это явно предупреждает (`maddy imap-acct create --help`):

> Note that in default configuration it is not enough to create an IMAP storage account to grant
> server access. Additionally, user credentials should be created using 'creds' subcommand.

Документация репозитория до сих пор описывала только половину — `creds create` — как «создать
пользователя», из-за чего обратная сторона того же требования (для приёма почты нужен ещё и
`imap-acct create`) нигде явно не была написана.

## Фикс

Заводить новый локальный адрес — обеими командами, не одной:

```bash
docker exec -i maddy maddy creds create <адрес>       # SMTP/IMAP-аутентификация
docker exec maddy maddy imap-acct create <адрес>      # хранилище для приёма/IMAP
```

Порядок не важен — обе записи независимы и опираются на одно и то же имя пользователя.

## Как воспроизвести проверку

Округлённый round-trip (заведение → отправка себе → чтение по IMAP → удаление тестового письма) —
рабочий способ убедиться, что адрес реально принимает почту, а не только проходит `creds list`:

1. `docker exec -i maddy maddy creds password <адрес>` — установить пароль (через stdin, не
   `-p`, чтобы не светить его в истории/логах).
2. Если адрес будет использоваться и как отправитель — добавить его в
   `/data/sender_map.txt` (`<адрес>: <адрес>`), иначе `submission` отклонит `553 5.7.0
   Unauthorized use of sender address` независимо от корректного логина/пароля (не тот же класс
   ошибки, что описан здесь, но легко спутать при первой проверке — оба всплывают в одном
   тестовом сценарии «отправить самому себе»).
3. Отправить тестовое письмо через `smtplib` (STARTTLS, порт 587) себе же.
4. Прочитать через `imaplib.IMAP4_SSL` (порт 993), убедиться, что письмо дошло, удалить его
   (`+FLAGS \Deleted` + `expunge`), чтобы не засорять ящик мусором.

## Прецедент

Ящик `canary-domwellbes@letar.best` (адрес канареечного логин-аккаунта domwellbes,
`LOGIN_CANARY_DOMWELLBES_EMAIL` в реестре `apps/dashboard/.env.docker.enc`, см.
`apps/dashboard-agent/src/lib/login-canary.ts`/`login-canary-setup.ts`) был заведён только через
`creds create` 2026-09-05 — первая же попытка доставки тут же вернула `501 5.1.1 User does not
exist`. Найдено и исправлено сразу тем же способом, что описан выше (`imap-acct create` +
проверочный round-trip). Тот же паттерн стоит перепроверить у любого адреса, заведённого до этой
даты по старой (неполной) инструкции — `maddy imap-acct list` короче `maddy creds list`, разницу
множеств стоит просмотреть глазами.

## Связанные доки

- [email.md](/.claude/docs/email.md) — общая архитектура почты монорепо
- [email-maddy skill](/.claude/skills/email-maddy/SKILL.md) — быстрые команды
- [email-maddy/reference/maddy-config.md](/.claude/skills/email-maddy/reference/maddy-config.md) —
  полный конфиг, `storage.imapsql`/`auth.pass_table`
