/*
  Warnings:

  - You are about to drop the `electricity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "electricity";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "grid_energy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "kwh_imported" REAL,
    "kwh_exported" REAL,
    "granularity" TEXT NOT NULL,
    "rate_id" INTEGER,
    "export_rate_id" INTEGER,
    "source" TEXT,
    CONSTRAINT "grid_energy_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "grid_energy_export_rate_id_fkey" FOREIGN KEY ("export_rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "device_energy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "kwh_used" REAL,
    "granularity" TEXT NOT NULL,
    "rate_id" INTEGER,
    "entity_id" INTEGER,
    "source" TEXT,
    CONSTRAINT "device_energy_rate_id_fkey" FOREIGN KEY ("rate_id") REFERENCES "energy_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "device_energy_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "grid_energy_datetime_start_granularity_key" ON "grid_energy"("datetime_start", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "device_energy_datetime_start_granularity_key" ON "device_energy"("datetime_start", "granularity");
