-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "batterySize" INTEGER,
    "registrationNumber" TEXT,
    "vin" TEXT,
    "purchasePrice" REAL,
    "purchaseOdometer" INTEGER,
    "salePrice" REAL,
    "motDate" TEXT,
    "serviceDate" TEXT,
    "taxDate" TEXT,
    "imageUrl" TEXT,
    "dateAcquired" TEXT,
    "dateSold" TEXT
);
INSERT INTO "new_Car" ("batterySize", "dateAcquired", "dateSold", "id", "imageUrl", "make", "model", "motDate", "purchaseOdometer", "purchasePrice", "registrationNumber", "salePrice", "serviceDate", "taxDate", "variant", "vin") SELECT "batterySize", "dateAcquired", "dateSold", "id", "imageUrl", "make", "model", "motDate", "purchaseOdometer", "purchasePrice", "registrationNumber", "salePrice", "serviceDate", "taxDate", "variant", "vin" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
