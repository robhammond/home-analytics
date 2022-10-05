-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime_start" DATETIME,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL NOT NULL,
    "granularity" TEXT NOT NULL,
    "rateId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'n3rgy',
    CONSTRAINT "Electricity_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Electricity" ("datetime", "datetime_start", "granularity", "id", "kwh", "rateId") SELECT "datetime", "datetime_start", "granularity", "id", "kwh", "rateId" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
CREATE UNIQUE INDEX "Electricity_datetime_granularity_source_key" ON "Electricity"("datetime", "granularity", "source");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
