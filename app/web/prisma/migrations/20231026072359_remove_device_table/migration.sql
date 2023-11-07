/*
  Warnings:

  - You are about to drop the `device_energy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "device_energy_datetime_start_granularity_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "device_energy";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_entity_usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "duration_seconds" INTEGER,
    "duration_minutes" INTEGER,
    "entity_id" INTEGER NOT NULL,
    "rate_id" INTEGER,
    "granularity" TEXT NOT NULL,
    "kwh_used" REAL NOT NULL,
    "energy_cost" REAL,
    "source" TEXT,
    CONSTRAINT "entity_usage_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "entity_usage_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_entity_usage" ("datetime_end", "datetime_start", "duration_minutes", "duration_seconds", "energy_cost", "entity_id", "granularity", "id", "kwh_used") SELECT "datetime_end", "datetime_start", "duration_minutes", "duration_seconds", "energy_cost", "entity_id", "granularity", "id", "kwh_used" FROM "entity_usage";
DROP TABLE "entity_usage";
ALTER TABLE "new_entity_usage" RENAME TO "entity_usage";
CREATE UNIQUE INDEX "entity_usage_entity_id_datetime_start_granularity_key" ON "entity_usage"("entity_id", "datetime_start", "granularity");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
