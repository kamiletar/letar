-- Флаг «домашняя/гостевая» терминология для городов с домашними площадками
ALTER TABLE "City" ADD COLUMN "useHomeAway" BOOLEAN NOT NULL DEFAULT false;
