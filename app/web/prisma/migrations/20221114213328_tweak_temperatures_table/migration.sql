/*
  Warnings:

  - You are about to drop the column `granularity` on the `Temperature` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Temperature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "setTemperature" REAL,
    "outsideTemperature" REAL,
    "insideTemperature" REAL,
    "tankTemperature" REAL,
    "unit" TEXT NOT NULL DEFAULT 'hour'
);
INSERT INTO "new_Temperature" ("datetime", "id", "insideTemperature", "outsideTemperature", "tankTemperature") SELECT "datetime", "id", "insideTemperature", "outsideTemperature", "tankTemperature" FROM "Temperature";
DROP TABLE "Temperature";
ALTER TABLE "new_Temperature" RENAME TO "Temperature";
CREATE UNIQUE INDEX "Temperature_datetime_unit_key" ON "Temperature"("datetime", "unit");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
