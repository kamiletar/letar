-- Перенос приложений с s1 на s2
-- Все приложения кроме premium-rosstil и imot переносятся на s2

DO $$
DECLARE
  s1_id TEXT;
  s2_id TEXT;
  apps_to_move TEXT[] := ARRAY[
    'mandala', 'kami', 'pravda',
    'animatrona-landing', 'animatrona-tracker',
    'umami', 'kami-key-the-landing', 'letar-landing',
    'grandslamcup-staging'
  ];
  app_name TEXT;
BEGIN
  SELECT id INTO s1_id FROM "Server" WHERE name = 's1-letar';
  SELECT id INTO s2_id FROM "Server" WHERE name = 's2-letar';

  IF s1_id IS NULL OR s2_id IS NULL THEN
    RAISE NOTICE 'Серверы s1-letar или s2-letar не найдены, пропускаем миграцию';
    RETURN;
  END IF;

  FOREACH app_name IN ARRAY apps_to_move LOOP
    -- Удаляем запись на s2 если уже есть (дубль от seed)
    DELETE FROM "DeployedApp" WHERE name = app_name AND "serverId" = s2_id;

    -- Переносим с s1 на s2
    UPDATE "DeployedApp"
    SET "serverId" = s2_id, "updatedAt" = now()
    WHERE name = app_name AND "serverId" = s1_id;
  END LOOP;

  RAISE NOTICE 'Перенесено % приложений с s1 на s2', array_length(apps_to_move, 1);
END $$;
