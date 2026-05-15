-- CreateEnum: Gender для хранения пола пользователя
DO $$ BEGIN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: добавляем поле gender в User (если ещё нет)
DO $$ BEGIN
    ALTER TABLE "User" ADD COLUMN "gender" "Gender";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
