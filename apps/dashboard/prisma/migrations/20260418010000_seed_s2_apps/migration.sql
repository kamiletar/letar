-- Гарантированная синхронизация приложений s2 в DeployedApp
-- Использует INSERT ... ON CONFLICT DO UPDATE для идемпотентности

DO $$
DECLARE
  s2_id TEXT;
BEGIN
  SELECT id INTO s2_id FROM "Server" WHERE name = 's2-letar';

  IF s2_id IS NULL THEN
    RAISE NOTICE 'Сервер s2-letar не найден, пропускаем';
    RETURN;
  END IF;

  -- Удаляем старые s1-записи для переносимых приложений (если есть)
  DELETE FROM "DeployedApp"
  WHERE "serverId" != s2_id
    AND name IN (
      'mandala', 'kami', 'pravda', 'animatrona-landing', 'animatrona-tracker',
      'umami', 'kami-key-the-landing', 'letar-landing', 'grandslamcup-staging'
    );

  -- Вставляем/обновляем все приложения s2
  INSERT INTO "DeployedApp" (id, name, "displayName", "containerName", port, type, domain, "serverId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'mandala',              'Mandala',              'mandala-app',              3004, 'WEB', 'mandala.letar.best',                s2_id, now(), now()),
    (gen_random_uuid()::text, 'kami',                 'Kami',                 'kami-app',                 3005, 'WEB', 'kami.letar.best',                   s2_id, now(), now()),
    (gen_random_uuid()::text, 'pravda',               'Pravda',               'pravda-app',               3007, 'WEB', 'pravda.letar.best',                 s2_id, now(), now()),
    (gen_random_uuid()::text, 'animatrona-landing',   'Animatrona Landing',   'animatrona-landing-app',   3008, 'WEB', 'animatrona.letar.best',             s2_id, now(), now()),
    (gen_random_uuid()::text, 'animatrona-tracker',   'Animatrona Tracker',   'animatrona-tracker-app',   3009, 'WEB', 'animatrona-tracker.letar.best',     s2_id, now(), now()),
    (gen_random_uuid()::text, 'umami',                'Umami Analytics',      'umami-app',                3033, 'WEB', null,                                s2_id, now(), now()),
    (gen_random_uuid()::text, 'kami-key-the-landing', 'KamiKeyThe',           'kami-key-the-landing-app', 3011, 'WEB', 'kamikeythe.letar.best',             s2_id, now(), now()),
    (gen_random_uuid()::text, 'letar-landing',        'Letar Landing',        'letar-landing-app',        3015, 'WEB', 'letar.best',                        s2_id, now(), now()),
    (gen_random_uuid()::text, 'grandslamcup-staging', 'GrandSlamCup Staging', 'grandslamcup-staging-app', 3016, 'WEB', 'gsc-test.letar.best',               s2_id, now(), now())
  ON CONFLICT (name, "serverId") DO UPDATE SET
    "displayName"   = EXCLUDED."displayName",
    "containerName" = EXCLUDED."containerName",
    port            = EXCLUDED.port,
    domain          = EXCLUDED.domain,
    "updatedAt"     = now();

  RAISE NOTICE 'Синхронизация приложений s2 завершена';
END $$;
