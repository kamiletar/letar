-- AlterTable: category (singular, nullable) -> categories (array)
-- Шаг 1: добавить новый столбец categories как массив
ALTER TABLE "TheoryTopic" ADD COLUMN "categories" "LicenseCategory"[] DEFAULT ARRAY[]::"LicenseCategory"[];

-- Шаг 2: перенести данные из category в categories
UPDATE "TheoryTopic" SET "categories" = ARRAY["category"]::"LicenseCategory"[] WHERE "category" IS NOT NULL;

-- Шаг 3: удалить старый столбец
ALTER TABLE "TheoryTopic" DROP COLUMN "category";
