/*
  Warnings:

  - You are about to drop the column `datetime` on the `EntityUsage` table. All the data in the column will be lost.
  - Added the required column `datetime_end` to the `EntityUsage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `datetime_start` to the `EntityUsage` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EntityUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "duration_seconds" INTEGER,
    "duration_minutes" INTEGER,
    "entityId" INTEGER NOT NULL,
    "granularity" TEXT NOT NULL,
    "kwh_used" REAL NOT NULL,
    CONSTRAINT "EntityUsage_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EntityUsage" ("entityId", "granularity", "id", "kwh_used") SELECT "entityId", "granularity", "id", "kwh_used" FROM "EntityUsage";
DROP TABLE "EntityUsage";
ALTER TABLE "new_EntityUsage" RENAME TO "EntityUsage";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
