-- CreateTable
CREATE TABLE "Electricity" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "datetime" DATETIME NOT NULL,
    "kwh" REAL NOT NULL,
    "granularity" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "dateAcquired" DATETIME NOT NULL,
    "dateSold" DATETIME
);

-- CreateTable
CREATE TABLE "CarUsage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "carId" INTEGER NOT NULL,
    "datetime" DATETIME NOT NULL,
    "granularity" TEXT NOT NULL,
    "miles_travelled" REAL,
    "km_travelled" REAL,
    "kwh_used" REAL NOT NULL,
    CONSTRAINT "CarUsage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "datetime" DATETIME NOT NULL,
    "granularity" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "kwh_used" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ElectricTariff" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tariff_name" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "variable_cost" REAL NOT NULL,
    "standing_charge" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "tariff_start" DATETIME NOT NULL,
    "tariff_end" DATETIME
);
