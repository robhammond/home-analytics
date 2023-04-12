-- AlterTable
ALTER TABLE "Entity" ADD COLUMN "entity_category" TEXT;

-- CreateTable
CREATE TABLE "Solar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME NOT NULL,
    "datetime_end" DATETIME NOT NULL,
    "kwh_produced" REAL NOT NULL,
    "kwh_consumed" REAL NOT NULL,
    "kwh_exported" REAL NOT NULL,
    "kwh_imported" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Solar_datetime_start_datetime_end_key" ON "Solar"("datetime_start", "datetime_end");
