-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Electricity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL NOT NULL,
    "granularity" TEXT NOT NULL,
    "rateId" INTEGER,
    CONSTRAINT "Electricity_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Electricity" ("datetime", "granularity", "id", "kwh") SELECT "datetime", "granularity", "id", "kwh" FROM "Electricity";
DROP TABLE "Electricity";
ALTER TABLE "new_Electricity" RENAME TO "Electricity";
CREATE UNIQUE INDEX "Electricity_datetime_key" ON "Electricity"("datetime");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
