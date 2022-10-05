/*
  Warnings:

  - You are about to alter the column `estimatedRange` on the `CarStatus` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - You are about to alter the column `odometer` on the `CarStatus` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CarStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carId" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "odometer" REAL,
    "odometerUnit" TEXT,
    "batteryPercent" INTEGER,
    "batteryTemp" INTEGER,
    "batteryTempUnit" TEXT,
    "estimatedRange" REAL,
    "rangeUnit" TEXT,
    "chargingStatus" INTEGER,
    "chargingRemainingTime" INTEGER,
    "chargingTargetPercent" INTEGER,
    "isLocked" INTEGER,
    "locationLatLon" TEXT,
    CONSTRAINT "CarStatus_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CarStatus" ("batteryPercent", "carId", "chargingRemainingTime", "chargingStatus", "datetime", "estimatedRange", "id", "odometer") SELECT "batteryPercent", "carId", "chargingRemainingTime", "chargingStatus", "datetime", "estimatedRange", "id", "odometer" FROM "CarStatus";
DROP TABLE "CarStatus";
ALTER TABLE "new_CarStatus" RENAME TO "CarStatus";
CREATE UNIQUE INDEX "CarStatus_carId_datetime_key" ON "CarStatus"("carId", "datetime");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
