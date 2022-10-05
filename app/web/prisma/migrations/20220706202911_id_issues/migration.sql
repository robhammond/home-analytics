/*
  Warnings:

  - The primary key for the `Electricity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Electricity` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL NOT NULL,
    "granularity" TEXT NOT NULL
);
INSERT INTO "new_Electricity" ("datetime", "granularity", "id", "kwh") SELECT "datetime", "granularity", "id", "kwh" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
CREATE UNIQUE INDEX "Electricity_datetime_key" ON "Electricity"("datetime");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
