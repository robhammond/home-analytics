-- AlterTable
ALTER TABLE "Car" ADD COLUMN "purchase_mileage" INTEGER;
ALTER TABLE "Car" ADD COLUMN "vin_number" TEXT;

-- CreateTable
CREATE TABLE "Insurance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date_start" TEXT NOT NULL,
    "date_end" TEXT NOT NULL,
    "annual_cost" REAL NOT NULL,
    "entityId" INTEGER,
    "carId" INTEGER,
    CONSTRAINT "Insurance_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Insurance_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
